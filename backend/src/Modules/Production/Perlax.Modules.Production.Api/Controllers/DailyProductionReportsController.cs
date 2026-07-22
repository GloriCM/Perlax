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
[Route("api/production/daily-reports")]
[Authorize]
public sealed class DailyProductionReportsController : ControllerBase
{
    private readonly IDailyProductionService _service;
    private readonly IAuditService _audit;
    private readonly IHubContext<ProductionFloorHub> _hub;

    public DailyProductionReportsController(
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

    [HttpGet("catalogs")]
    public Task<DailyReportCatalogsDto> Catalogs(CancellationToken ct) => _service.GetCatalogsAsync(ct);

    [HttpGet]
    public Task<IReadOnlyList<DailyReportListItemDto>> List(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? operatorName,
        CancellationToken ct) =>
        _service.ListDailyReportsAsync(from, to, operatorName, ct);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DailyReportDetailDto>> GetBySession(Guid id, CancellationToken ct)
    {
        var sessions = await _service.ListSessionsAsync(null, null, null, null, ct);
        var session = sessions.FirstOrDefault(x => x.Id == id);
        if (session is null) return NotFound(new { message = "Reporte no encontrado." });

        return Ok(new DailyReportDetailDto(
            session.Id,
            session.OperationalDate,
            session.OperatorId,
            session.OperatorName,
            session.ShiftCode,
            session.StartedAt,
            session.EndedAt,
            session.Activities));
    }

    [HttpGet("by-operator")]
    public async Task<ActionResult<DailyReportDetailDto>> GetByOperator(
        [FromQuery] Guid operatorId,
        [FromQuery] DateOnly processDate,
        [FromQuery] string shiftCode = "T1",
        CancellationToken ct = default)
    {
        var detail = await _service.GetDailyReportAsync(operatorId, processDate, shiftCode, ct);
        return detail is null ? NotFound(new { message = "Reporte no encontrado." }) : Ok(detail);
    }

    [HttpGet("activities")]
    public Task<IReadOnlyList<ActivityDto>> Activities(
        [FromQuery] DateOnly? date,
        [FromQuery] Guid? machineId,
        [FromQuery] Guid? operatorId,
        [FromQuery] string? source,
        [FromQuery] bool finishedOnly = false,
        CancellationToken ct = default) =>
        _service.ListActivitiesAsync(date, machineId, operatorId, source, finishedOnly, ct);

    [HttpPost("manual")]
    public async Task<ActionResult<IReadOnlyList<DailyReportDetailDto>>> SaveManual(
        [FromBody] SaveManualBatchRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _service.SaveManualBatchAsync(request, Actor, ct);
            await _audit.LogAsync(UserId, Actor, "CREATE_DAILY_REPORT",
                $"Guardó {result.Count} reporte(s) manuales fecha {request.ProcessDate:yyyy-MM-dd}", Ip);

            await _hub.Clients.Group(ProductionFloorHub.DateGroup(request.ProcessDate.ToString("yyyy-MM-dd")))
                .SendAsync("floorChanged", new { date = request.ProcessDate }, ct);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Compatibilidad con el contrato anterior del frontend.</summary>
    [HttpPost]
    public async Task<ActionResult<DailyReportDetailDto>> CreateLegacy(
        [FromBody] LegacySaveDailyReportRequest request,
        CancellationToken ct)
    {
        var batch = new SaveManualBatchRequest(
            request.ProcessDate,
            string.IsNullOrWhiteSpace(request.ShiftCode) ? "T1" : request.ShiftCode,
            request.IdempotencyKey,
            [
                new SaveManualReportRequest(
                    request.ProcessDate,
                    request.OperatorId,
                    request.OperatorName,
                    string.IsNullOrWhiteSpace(request.ShiftCode) ? "T1" : request.ShiftCode,
                    null,
                    (request.Processes ?? []).Select(p => new SaveManualProcessRequest(
                        p.MachineId,
                        p.MachineName,
                        p.ActivityCodeId,
                        p.ProcessCode ?? p.ActivityCode,
                        p.SubcodeId,
                        p.Subcode,
                        p.ProductionOrderNumber,
                        p.StartAt,
                        p.EndAt,
                        p.QuantityProcessed,
                        p.Desperdicio ?? p.Waste,
                        p.Observations,
                        p.WasteEntries)).ToList())
            ]);

        try
        {
            var result = await _service.SaveManualBatchAsync(batch, Actor, ct);
            await _audit.LogAsync(UserId, Actor, "CREATE_DAILY_REPORT",
                $"Guardó reporte legacy {request.OperatorName} {request.ProcessDate:yyyy-MM-dd}", Ip);
            await _hub.Clients.Group(ProductionFloorHub.DateGroup(request.ProcessDate.ToString("yyyy-MM-dd")))
                .SendAsync("floorChanged", new { date = request.ProcessDate }, ct);
            return Ok(result.FirstOrDefault());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DailyReportDetailDto>> UpdateLegacy(
        Guid id,
        [FromBody] LegacySaveDailyReportRequest request,
        CancellationToken ct)
    {
        // Reemplazo por operario+fecha+turno (proyección), id de sesión se ignora como clave canónica
        return await CreateLegacy(request, ct);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] DateOnly date,
        [FromQuery] string groupBy = "operator",
        [FromQuery] Guid? operatorId = null,
        [FromQuery] Guid? machineId = null,
        CancellationToken ct = default)
    {
        var bytes = await _service.ExportExcelAsync(date, groupBy, operatorId, machineId, ct);
        var name = $"reporte_{groupBy}_{date:yyyyMMdd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name);
    }

    [HttpPost("import-local")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<ImportLocalResult>> ImportLocal([FromBody] ImportLocalPayload payload, CancellationToken ct)
    {
        try
        {
            var result = await _service.ImportLocalAsync(payload, Actor, ct);
            await _audit.LogAsync(UserId, Actor, "IMPORT_LOCAL_DAILY_PRODUCTION",
                $"Importó local: M={result.MachinesCreated} O={result.OperatorsCreated} S={result.SessionsCreated} A={result.ActivitiesCreated}", Ip);
            return Ok(result);
        }
        catch (Exception ex) when (ex is InvalidOperationException or DbUpdateException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public sealed class LegacySaveDailyReportRequest
{
    public DateOnly ProcessDate { get; set; }
    public Guid? OperatorId { get; set; }
    public string? OperatorName { get; set; }
    public string? ShiftCode { get; set; }
    public string? IdempotencyKey { get; set; }
    public List<LegacySaveProcessRequest>? Processes { get; set; }
}

public sealed class LegacySaveProcessRequest
{
    public Guid? MachineId { get; set; }
    public string? MachineName { get; set; }
    public Guid? ActivityCodeId { get; set; }
    public string? ProcessCode { get; set; }
    public string? ActivityCode { get; set; }
    public Guid? SubcodeId { get; set; }
    public string? Subcode { get; set; }
    public string? ProductionOrderNumber { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public decimal QuantityProcessed { get; set; }
    public decimal? Desperdicio { get; set; }
    public decimal Waste { get; set; }
    public string? Observations { get; set; }
    public List<WasteEntryDto>? WasteEntries { get; set; }
}
