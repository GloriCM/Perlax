using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Perlax.Modules.Production.Api.Hubs;
using Perlax.Modules.Production.Application.DailyProduction;

namespace Perlax.Modules.Production.Api.Controllers;

/// <summary>
/// Operación de piso anónima protegida por red (mismo criterio que /api/planta/access).
/// </summary>
[ApiController]
[Route("api/planta/floor")]
[AllowAnonymous]
public sealed class PlantaFloorController : ControllerBase
{
    private readonly IDailyProductionService _service;
    private readonly PlantaOptions _options;
    private readonly IWebHostEnvironment _environment;
    private readonly IHubContext<ProductionFloorHub> _hub;

    public PlantaFloorController(
        IDailyProductionService service,
        IOptions<PlantaOptions> options,
        IWebHostEnvironment environment,
        IHubContext<ProductionFloorHub> hub)
    {
        _service = service;
        _options = options.Value;
        _environment = environment;
        _hub = hub;
    }

    private IActionResult? Guard()
    {
        if (!PlantaController.IsRequestAllowed(HttpContext, _options, _environment, out var errorBody))
            return StatusCode(StatusCodes.Status403Forbidden, errorBody);
        return null;
    }

    [HttpGet("catalogs")]
    public async Task<IActionResult> Catalogs(CancellationToken ct)
    {
        if (Guard() is { } denied) return denied;
        return Ok(await _service.GetPlantaCatalogsAsync(ct));
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> Sessions([FromQuery] DateOnly? date, CancellationToken ct)
    {
        if (Guard() is { } denied) return denied;
        return Ok(await _service.ListSessionsAsync(date ?? DateOnly.FromDateTime(DateTime.Now), null, null, null, ct));
    }

    [HttpPost("sessions/start")]
    public async Task<IActionResult> Start([FromBody] StartSessionRequest request, CancellationToken ct)
    {
        if (Guard() is { } denied) return denied;
        try
        {
            var session = await _service.StartSessionAsync(request, "planta", ct);
            await Notify(session.OperationalDate, ct);
            return Ok(session);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sessions/{id:guid}/pause")]
    public async Task<IActionResult> Pause(Guid id, CancellationToken ct)
    {
        if (Guard() is { } denied) return denied;
        try
        {
            var session = await _service.PauseSessionAsync(id, "planta", ct);
            await Notify(session.OperationalDate, ct);
            return Ok(session);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sessions/{id:guid}/resume")]
    public async Task<IActionResult> Resume(Guid id, CancellationToken ct)
    {
        if (Guard() is { } denied) return denied;
        try
        {
            var session = await _service.ResumeSessionAsync(id, "planta", ct);
            await Notify(session.OperationalDate, ct);
            return Ok(session);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sessions/{id:guid}/finish")]
    public async Task<IActionResult> Finish(Guid id, CancellationToken ct)
    {
        if (Guard() is { } denied) return denied;
        try
        {
            var session = await _service.FinishSessionAsync(id, "planta", ct);
            await Notify(session.OperationalDate, ct);
            return Ok(session);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sessions/{id:guid}/activities")]
    public async Task<IActionResult> StartActivity(Guid id, [FromBody] StartActivityRequest request, CancellationToken ct)
    {
        if (Guard() is { } denied) return denied;
        try
        {
            var activity = await _service.StartActivityAsync(id, request, "planta", ct);
            await Notify(activity.OperationalDate, ct);
            return Ok(activity);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("activities/{id:guid}/finish")]
    public async Task<IActionResult> FinishActivity(Guid id, [FromBody] FinishActivityRequest request, CancellationToken ct)
    {
        if (Guard() is { } denied) return denied;
        try
        {
            var activity = await _service.FinishActivityAsync(id, request, "planta", ct);
            await Notify(activity.OperationalDate, ct);
            return Ok(activity);
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "La sesión fue actualizada por otra acción. Intente de nuevo." });
        }
    }

    private Task Notify(DateOnly date, CancellationToken ct) =>
        _hub.Clients.Group(ProductionFloorHub.DateGroup(date.ToString("yyyy-MM-dd")))
            .SendAsync("floorChanged", new { date }, ct);
}
