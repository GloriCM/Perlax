using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Api.Hubs;
using Perlax.Modules.Production.Application.DailyProduction;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Route("api/production")]
[Authorize]
public sealed class ProductionSessionsController : ControllerBase
{
    private readonly IDailyProductionService _service;
    private readonly IAuditService _audit;
    private readonly IHubContext<ProductionFloorHub> _hub;

    public ProductionSessionsController(
        IDailyProductionService service,
        IAuditService audit,
        IHubContext<ProductionFloorHub> hub)
    {
        _service = service;
        _audit = audit;
        _hub = hub;
    }

    private string Actor =>
        User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue("unique_name")
        ?? User.Identity?.Name
        ?? "unknown";

    private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    private string Ip => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";

    [HttpGet("orders/lookup")]
    public Task<IReadOnlyList<OrderLookupDto>> OrdersLookup([FromQuery] string? q, [FromQuery] int take = 50, CancellationToken ct = default) =>
        _service.LookupOrdersAsync(q, take, ct);

    [HttpGet("sessions")]
    public Task<IReadOnlyList<SessionDto>> Sessions(
        [FromQuery] DateOnly? date,
        [FromQuery] string? status,
        [FromQuery] Guid? machineId,
        [FromQuery] Guid? operatorId,
        CancellationToken ct) =>
        _service.ListSessionsAsync(date, status, machineId, operatorId, ct);

    [HttpPost("sessions/start")]
    public async Task<ActionResult<SessionDto>> Start([FromBody] StartSessionRequest request, CancellationToken ct)
    {
        try
        {
            var session = await _service.StartSessionAsync(request, Actor, ct);
            await Notify(session.OperationalDate, ct);
            await _audit.LogAsync(UserId, Actor, "START_PRODUCTION_SESSION", $"Sesión {session.Id} máquina {session.MachineName}", Ip);
            return Ok(session);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sessions/{id:guid}/pause")]
    public async Task<ActionResult<SessionDto>> Pause(Guid id, CancellationToken ct)
    {
        try
        {
            var session = await _service.PauseSessionAsync(id, Actor, ct);
            await Notify(session.OperationalDate, ct);
            return Ok(session);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sessions/{id:guid}/resume")]
    public async Task<ActionResult<SessionDto>> Resume(Guid id, CancellationToken ct)
    {
        try
        {
            var session = await _service.ResumeSessionAsync(id, Actor, ct);
            await Notify(session.OperationalDate, ct);
            return Ok(session);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sessions/{id:guid}/finish")]
    public async Task<ActionResult<SessionDto>> Finish(Guid id, CancellationToken ct)
    {
        try
        {
            var session = await _service.FinishSessionAsync(id, Actor, ct);
            await Notify(session.OperationalDate, ct);
            await _audit.LogAsync(UserId, Actor, "FINISH_PRODUCTION_SESSION", $"Sesión {id}", Ip);
            return Ok(session);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sessions/{id:guid}/activities")]
    public async Task<ActionResult<ActivityDto>> StartActivity(Guid id, [FromBody] StartActivityRequest request, CancellationToken ct)
    {
        try
        {
            var activity = await _service.StartActivityAsync(id, request, Actor, ct);
            await Notify(activity.OperationalDate, ct);
            return Ok(activity);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("activities/{id:guid}/finish")]
    public async Task<ActionResult<ActivityDto>> FinishActivity(Guid id, [FromBody] FinishActivityRequest request, CancellationToken ct)
    {
        try
        {
            var activity = await _service.FinishActivityAsync(id, request, Actor, ct);
            await Notify(activity.OperationalDate, ct);
            return Ok(activity);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "La sesión fue modificada por otro usuario. Recargue e intente de nuevo." });
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private Task Notify(DateOnly date, CancellationToken ct) =>
        _hub.Clients.Group(ProductionFloorHub.DateGroup(date.ToString("yyyy-MM-dd")))
            .SendAsync("floorChanged", new { date }, ct);
}
