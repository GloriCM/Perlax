using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.Scheduling;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/scheduling")]
public partial class OpProcessSchedulingController : ControllerBase
{
    private readonly IOpSchedulingService _scheduling;

    public OpProcessSchedulingController(IOpSchedulingService scheduling)
    {
        _scheduling = scheduling;
    }

    [HttpGet("processes")]
    public async Task<ActionResult<IEnumerable<object>>> GetProcesses(CancellationToken ct)
    {
        var rows = await _scheduling.GetActiveProcessesAsync(ct);
        return Ok(rows.Select(p => new { code = p.Code, label = p.Label, sortOrder = p.SortOrder, id = p.Id }));
    }

    [HttpGet("open-orders")]
    public async Task<ActionResult<IEnumerable<object>>> GetOpenOrders([FromQuery] string? q, CancellationToken ct)
    {
        var rows = await _scheduling.GetOpenOrdersAsync(q, ct);
        return Ok(rows.Select(m => new
        {
            id = m.Id,
            opNumber = m.OpNumber,
            otNumber = m.OtNumber,
            clientName = m.ClientName,
            productName = m.ProductName,
            referenceName = m.ReferenceName,
            quantityToProduce = m.QuantityToProduce,
            hasSchedule = m.HasSchedule
        }));
    }

    [HttpGet("open-orders/{id:guid}/prefill")]
    public async Task<ActionResult<object>> GetOrderPrefill(Guid id, CancellationToken ct)
    {
        try
        {
            var mo = await _scheduling.GetOpenOrderPrefillAsync(id, ct);
            return Ok(new
            {
                id = mo.Id,
                opNumber = mo.OpNumber,
                otNumber = mo.OtNumber,
                clientName = mo.ClientName,
                productName = mo.ProductName,
                referenceName = mo.ReferenceName,
                purchaseOrderNumber = mo.PurchaseOrderNumber,
                agreedDeliveryDate = mo.AgreedDeliveryDate,
                quantityToProduce = mo.QuantityToProduce,
                approvedUnitPrice = mo.ApprovedUnitPrice,
                status = mo.Status,
                existingProcesses = mo.ExistingProcesses.Select(MapScheduleBlockDto),
                suggestedProcesses = mo.SuggestedProcesses.Select(s => new
                {
                    processCode = s.ProcessCode,
                    label = s.Label,
                    machine = s.Machine,
                    notes = s.Notes,
                    partName = s.PartName
                })
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("gantt")]
    public async Task<ActionResult<object>> GetGantt(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] string? q,
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        try
        {
            var gantt = await _scheduling.GetGanttAsync(y, m, q, status, ct);
            return Ok(new
            {
                year = gantt.Year,
                month = gantt.Month,
                monthStart = gantt.MonthStart,
                monthEnd = gantt.MonthEnd,
                daysInMonth = gantt.DaysInMonth,
                weeks = gantt.Weeks.Select(w => new
                {
                    label = w.Label,
                    startDay = w.StartDay,
                    endDay = w.EndDay,
                    start = new DateTime(gantt.Year, gantt.Month, w.StartDay, 0, 0, 0, DateTimeKind.Utc),
                    end = new DateTime(gantt.Year, gantt.Month, w.EndDay, 23, 59, 59, DateTimeKind.Utc),
                }),
                processes = gantt.Processes.Select(p => new { id = p.Id, code = p.Code, label = p.Label, sortOrder = p.SortOrder }),
                blocks = gantt.Blocks.Select(MapScheduleBlockDto).ToList(),
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<object>>> GetList(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] string? q,
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        var groups = await _scheduling.GetMonthListAsync(y, m, q, status, ct);
        return Ok(groups.Select(g => new
        {
            manufacturingOrderId = g.ManufacturingOrderId,
            opNumber = g.OpNumber,
            otNumber = g.OtNumber,
            clientName = g.ClientName,
            productName = g.ProductName,
            referenceName = g.ReferenceName,
            isUrgency = g.IsUrgency,
            generalStatus = g.GeneralStatus,
            plannedStart = g.PlannedStart,
            plannedEnd = g.PlannedEnd,
            processCount = g.ProcessCount,
            processes = g.Processes.Select(MapScheduleBlockDto).ToList()
        }));
    }

    [HttpGet("current")]
    public async Task<ActionResult<IEnumerable<object>>> GetCurrentForMachine(
        [FromQuery] Guid machineId,
        [FromQuery] DateTime? date,
        CancellationToken ct)
    {
        if (machineId == Guid.Empty)
            return BadRequest(new { message = "Maquina obligatoria." });

        try
        {
            DateOnly? day = date.HasValue
                ? DateOnly.FromDateTime(date.Value.Kind == DateTimeKind.Utc
                    ? date.Value
                    : DateTime.SpecifyKind(date.Value, DateTimeKind.Utc))
                : null;
            var blocks = await _scheduling.GetMachineScheduleAsync(machineId, day, ct);
            return Ok(blocks.Select(MapScheduleBlockDto));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("blocks")]
    public async Task<ActionResult<object>> CreateBlock([FromBody] UpsertScheduleBlockRequest request, CancellationToken ct)
    {
        try
        {
            var block = await _scheduling.CreateBlockAsync(ToCommand(request), GetCurrentUserName(), ct);
            return CreatedAtAction(nameof(GetGantt), new { year = block.PlannedStart.Year, month = block.PlannedStart.Month }, MapScheduleBlockDto(block));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("blocks/{id:guid}")]
    public async Task<ActionResult<object>> UpdateBlock(Guid id, [FromBody] UpsertScheduleBlockRequest request, CancellationToken ct)
    {
        try
        {
            var block = await _scheduling.UpdateBlockAsync(id, ToCommand(request), GetCurrentUserName(), ct);
            return Ok(MapScheduleBlockDto(block));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("blocks/{id:guid}")]
    public async Task<ActionResult> DeleteBlock(Guid id, CancellationToken ct)
    {
        try
        {
            await _scheduling.DeleteBlockAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("program")]
    public async Task<ActionResult<object>> ProgramOrder([FromBody] ProgramOrderRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _scheduling.ProgramOrderAsync(new ProgramOrderCommand(
                request.ManufacturingOrderId,
                request.IsUrgency,
                (request.Processes ?? new List<ProgramProcessInput>())
                    .Select(p => new ProgramProcessCommand(
                        p.ProcessCode, p.MachineId, p.PlannedStart, p.PlannedEnd,
                        p.SortOrder, p.EstimatedHours, p.Notes))
                    .ToList()),
                GetCurrentUserName(), ct);

            return Ok(new
            {
                manufacturingOrderId = result.ManufacturingOrderId,
                opNumber = result.OpNumber,
                isUrgency = result.IsUrgency,
                processes = result.Processes.Select(MapScheduleBlockDto)
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("program/{manufacturingOrderId:guid}")]
    public async Task<ActionResult> DeleteProgram(Guid manufacturingOrderId, CancellationToken ct)
    {
        try
        {
            await _scheduling.DeleteProgramAsync(manufacturingOrderId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    private static UpsertScheduleBlockCommand ToCommand(UpsertScheduleBlockRequest request) => new(
        request.ManufacturingOrderId,
        request.ProcessCode,
        request.MachineId,
        request.BlockType,
        request.PlannedStart,
        request.PlannedEnd,
        request.Status,
        request.SortOrder,
        request.Notes,
        request.IsUrgency,
        request.EstimatedHours);

    private static object MapScheduleBlockDto(ScheduleBlockDto b) => new
    {
        id = b.Id,
        manufacturingOrderId = b.ManufacturingOrderId,
        processCode = b.ProcessCode,
        machineId = b.MachineId,
        blockType = b.BlockType,
        plannedStart = b.PlannedStart,
        plannedEnd = b.PlannedEnd,
        status = b.Status,
        sortOrder = b.SortOrder,
        isUrgency = b.IsUrgency,
        estimatedHours = b.EstimatedHours,
        notes = b.Notes,
        opNumber = b.OpNumber,
        otNumber = b.OtNumber,
        clientName = b.ClientName,
        productName = b.ProductName,
        referenceName = b.ReferenceName
    };

    private string GetCurrentUserName()
    {
        var name = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? User.Identity?.Name;
        return string.IsNullOrWhiteSpace(name) ? "system" : name;
    }

    public record UpsertScheduleBlockRequest(
        Guid? ManufacturingOrderId,
        string ProcessCode,
        Guid? MachineId,
        string? BlockType,
        DateTime PlannedStart,
        DateTime PlannedEnd,
        string? Status,
        int SortOrder,
        string? Notes,
        bool IsUrgency = false,
        decimal? EstimatedHours = null);

    public record ProgramProcessInput(
        string ProcessCode,
        Guid? MachineId,
        DateTime PlannedStart,
        DateTime PlannedEnd,
        int SortOrder,
        decimal? EstimatedHours,
        string? Notes);

    public record ProgramOrderRequest(
        Guid ManufacturingOrderId,
        bool IsUrgency,
        List<ProgramProcessInput> Processes);
}