using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.DailyProduction;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Route("api/production/catalogs")]
[Authorize]
public sealed class ProductionCatalogsController : ControllerBase
{
    private readonly IDailyProductionService _service;
    private readonly IAuditService _audit;

    public ProductionCatalogsController(IDailyProductionService service, IAuditService audit)
    {
        _service = service;
        _audit = audit;
    }

    private string Actor =>
        User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue("unique_name")
        ?? User.Identity?.Name
        ?? "unknown";

    private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    private string Ip => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";

    [HttpGet("machines")]
    public Task<IReadOnlyList<MachineDto>> Machines([FromQuery] bool includeInactive = false, CancellationToken ct = default) =>
        _service.ListMachinesAsync(includeInactive, ct);

    [HttpPost("machines")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<MachineDto>> CreateMachine([FromBody] UpsertMachineRequest request, CancellationToken ct)
    {
        var result = await _service.UpsertMachineAsync(null, request, Actor, ct);
        await _audit.LogAsync(UserId, Actor, "UPSERT_PRODUCTION_MACHINE", $"Creó máquina {result.Code} - {result.Name}", Ip);
        return Ok(result);
    }

    [HttpPut("machines/{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<MachineDto>> UpdateMachine(Guid id, [FromBody] UpsertMachineRequest request, CancellationToken ct)
    {
        var result = await _service.UpsertMachineAsync(id, request, Actor, ct);
        await _audit.LogAsync(UserId, Actor, "UPSERT_PRODUCTION_MACHINE", $"Actualizó máquina {result.Code}", Ip);
        return Ok(result);
    }

    [HttpDelete("machines/{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<IActionResult> DeleteMachine(Guid id, CancellationToken ct)
    {
        await _service.DeleteMachineAsync(id, ct);
        await _audit.LogAsync(UserId, Actor, "DELETE_PRODUCTION_MACHINE", $"Eliminó/desactivó máquina {id}", Ip);
        return NoContent();
    }

    [HttpGet("operators")]
    public Task<IReadOnlyList<OperatorDto>> Operators([FromQuery] bool includeInactive = false, CancellationToken ct = default) =>
        _service.ListOperatorsAsync(includeInactive, ct);

    [HttpPost("operators")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<OperatorDto>> CreateOperator([FromBody] UpsertOperatorRequest request, CancellationToken ct)
    {
        var result = await _service.UpsertOperatorAsync(null, request, Actor, ct);
        await _audit.LogAsync(UserId, Actor, "UPSERT_PRODUCTION_OPERATOR", $"Creó operario {result.Code}", Ip);
        return Ok(result);
    }

    [HttpPut("operators/{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<OperatorDto>> UpdateOperator(Guid id, [FromBody] UpsertOperatorRequest request, CancellationToken ct)
    {
        var result = await _service.UpsertOperatorAsync(id, request, Actor, ct);
        await _audit.LogAsync(UserId, Actor, "UPSERT_PRODUCTION_OPERATOR", $"Actualizó operario {result.Code}", Ip);
        return Ok(result);
    }

    [HttpDelete("operators/{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<IActionResult> DeleteOperator(Guid id, CancellationToken ct)
    {
        await _service.DeleteOperatorAsync(id, ct);
        await _audit.LogAsync(UserId, Actor, "DELETE_PRODUCTION_OPERATOR", $"Eliminó/desactivó operario {id}", Ip);
        return NoContent();
    }

    [HttpGet("activity-codes")]
    public Task<IReadOnlyList<ActivityCodeDto>> ActivityCodes([FromQuery] bool includeInactive = false, CancellationToken ct = default) =>
        _service.ListActivityCodesAsync(includeInactive, ct);

    [HttpPost("activity-codes")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<ActivityCodeDto>> CreateActivityCode([FromBody] UpsertActivityCodeRequest request, CancellationToken ct)
    {
        var result = await _service.UpsertActivityCodeAsync(null, request, Actor, ct);
        await _audit.LogAsync(UserId, Actor, "UPSERT_ACTIVITY_CODE", $"Creó código {result.Code}", Ip);
        return Ok(result);
    }

    [HttpPut("activity-codes/{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<ActivityCodeDto>> UpdateActivityCode(Guid id, [FromBody] UpsertActivityCodeRequest request, CancellationToken ct)
    {
        var result = await _service.UpsertActivityCodeAsync(id, request, Actor, ct);
        await _audit.LogAsync(UserId, Actor, "UPSERT_ACTIVITY_CODE", $"Actualizó código {result.Code}", Ip);
        return Ok(result);
    }

    [HttpDelete("activity-codes/{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<IActionResult> DeleteActivityCode(Guid id, CancellationToken ct)
    {
        await _service.DeleteActivityCodeAsync(id, ct);
        await _audit.LogAsync(UserId, Actor, "DELETE_ACTIVITY_CODE", $"Eliminó/desactivó código {id}", Ip);
        return NoContent();
    }

    [HttpGet("shifts")]
    public async Task<IActionResult> Shifts(CancellationToken ct)
    {
        var catalogs = await _service.GetCatalogsAsync(ct);
        return Ok(catalogs.Shifts);
    }

    [HttpGet("waste-reasons")]
    public async Task<IActionResult> WasteReasons(CancellationToken ct)
    {
        var catalogs = await _service.GetCatalogsAsync(ct);
        return Ok(catalogs.WasteReasons);
    }
}
