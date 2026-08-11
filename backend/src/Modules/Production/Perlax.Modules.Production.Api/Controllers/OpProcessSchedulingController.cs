using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/scheduling")]
public class OpProcessSchedulingController : ControllerBase
{
    private readonly ProductionDbContext _context;

    public OpProcessSchedulingController(ProductionDbContext context)
    {
        _context = context;
    }

    [HttpGet("processes")]
    public ActionResult<IEnumerable<object>> GetProcesses()
    {
        var rows = ProductionProcessCatalog.All
            .OrderBy(p => p.SortOrder)
            .Select(p => new { code = p.Code, label = p.Label, sortOrder = p.SortOrder });
        return Ok(rows);
    }

    [HttpGet("open-orders")]
    public async Task<ActionResult<IEnumerable<object>>> GetOpenOrders([FromQuery] string? q, CancellationToken ct)
    {
        var query = _context.ManufacturingOrders
            .AsNoTracking()
            .Where(m => m.OpeningDate != null && m.Status != "Cerrada");

        var term = string.IsNullOrWhiteSpace(q) ? null : q.Trim().ToLowerInvariant();
        if (term != null)
        {
            query = query.Where(m =>
                m.OpNumber.ToLower().Contains(term) ||
                m.OtNumber.ToLower().Contains(term) ||
                m.ClientName.ToLower().Contains(term) ||
                m.OrderNumber.ToLower().Contains(term) ||
                m.ProductName.ToLower().Contains(term));
        }

        var rows = await query
            .OrderByDescending(m => m.OpeningDate)
            .ThenBy(m => m.OpNumber)
            .Select(m => new
            {
                id = m.Id,
                opNumber = m.OpNumber,
                orderNumber = m.OrderNumber,
                otNumber = m.OtNumber,
                clientName = m.ClientName,
                productName = m.ProductName,
                referenceName = m.ReferenceName,
                agreedDeliveryDate = m.AgreedDeliveryDate,
                quantityToProduce = m.QuantityToProduce,
                status = m.Status
            })
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("gantt")]
    public async Task<ActionResult<object>> GetGantt(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] string? q,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        if (m < 1 || m > 12)
            return BadRequest(new { message = "Mes invalido." });

        var monthStart = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
        var daysInMonth = DateTime.DaysInMonth(y, m);
        var weeks = BuildWeeks(y, m, daysInMonth);

        var blocksQuery = _context.OpProcessSchedules
            .AsNoTracking()
            .Where(b => b.PlannedStart <= monthEnd && b.PlannedEnd >= monthStart);

        var term = string.IsNullOrWhiteSpace(q) ? null : q.Trim().ToLowerInvariant();
        if (term != null)
        {
            blocksQuery = blocksQuery.Where(b =>
                (b.ManufacturingOrder != null && (
                    b.ManufacturingOrder.OpNumber.ToLower().Contains(term) ||
                    b.ManufacturingOrder.OtNumber.ToLower().Contains(term) ||
                    b.ManufacturingOrder.ClientName.ToLower().Contains(term) ||
                    b.ManufacturingOrder.OrderNumber.ToLower().Contains(term))) ||
                (b.Notes != null && b.Notes.ToLower().Contains(term)));
        }

        var blocks = await blocksQuery
            .Include(b => b.ManufacturingOrder)
            .OrderBy(b => b.ProcessCode)
            .ThenBy(b => b.PlannedStart)
            .ThenBy(b => b.SortOrder)
            .Select(b => new
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
                notes = b.Notes,
                opNumber = b.ManufacturingOrder != null ? b.ManufacturingOrder.OpNumber : null,
                otNumber = b.ManufacturingOrder != null ? b.ManufacturingOrder.OtNumber : null,
                clientName = b.ManufacturingOrder != null ? b.ManufacturingOrder.ClientName : null,
                productName = b.ManufacturingOrder != null ? b.ManufacturingOrder.ProductName : null
            })
            .ToListAsync(ct);

        var processes = ProductionProcessCatalog.All
            .OrderBy(p => p.SortOrder)
            .Select(p => new { code = p.Code, label = p.Label, sortOrder = p.SortOrder });

        return Ok(new
        {
            year = y,
            month = m,
            monthStart,
            monthEnd,
            daysInMonth,
            weeks,
            processes,
            blocks
        });
    }

    [HttpPost("blocks")]
    public async Task<ActionResult<object>> CreateBlock([FromBody] UpsertScheduleBlockRequest request, CancellationToken ct)
    {
        var validation = await ValidateBlockRequestAsync(request, null, ct);
        if (validation != null)
            return validation;

        var user = GetCurrentUserName();
        var block = new OpProcessSchedule
        {
            Id = Guid.NewGuid(),
            ManufacturingOrderId = request.ManufacturingOrderId,
            ProcessCode = request.ProcessCode.Trim(),
            MachineId = request.MachineId,
            BlockType = string.IsNullOrWhiteSpace(request.BlockType) ? OpScheduleBlockTypes.Op : request.BlockType.Trim(),
            PlannedStart = NormalizeUtc(request.PlannedStart),
            PlannedEnd = NormalizeUtcEndOfDay(request.PlannedEnd),
            Status = string.IsNullOrWhiteSpace(request.Status) ? OpScheduleStatuses.Scheduled : request.Status.Trim(),
            SortOrder = request.SortOrder,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = user
        };

        _context.OpProcessSchedules.Add(block);
        await _context.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetGantt), new { year = block.PlannedStart.Year, month = block.PlannedStart.Month }, await MapBlockAsync(block.Id, ct));
    }

    [HttpPut("blocks/{id:guid}")]
    public async Task<ActionResult<object>> UpdateBlock(Guid id, [FromBody] UpsertScheduleBlockRequest request, CancellationToken ct)
    {
        var block = await _context.OpProcessSchedules.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (block == null)
            return NotFound();

        var validation = await ValidateBlockRequestAsync(request, id, ct);
        if (validation != null)
            return validation;

        var user = GetCurrentUserName();
        block.ManufacturingOrderId = request.ManufacturingOrderId;
        block.ProcessCode = request.ProcessCode.Trim();
        block.MachineId = request.MachineId;
        block.BlockType = string.IsNullOrWhiteSpace(request.BlockType) ? OpScheduleBlockTypes.Op : request.BlockType.Trim();
        block.PlannedStart = NormalizeUtc(request.PlannedStart);
        block.PlannedEnd = NormalizeUtcEndOfDay(request.PlannedEnd);
        block.Status = string.IsNullOrWhiteSpace(request.Status) ? OpScheduleStatuses.Scheduled : request.Status.Trim();
        block.SortOrder = request.SortOrder;
        block.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        block.UpdatedAt = DateTime.UtcNow;
        block.UpdatedBy = user;

        await _context.SaveChangesAsync(ct);
        return Ok(await MapBlockAsync(block.Id, ct));
    }

    [HttpDelete("blocks/{id:guid}")]
    public async Task<ActionResult> DeleteBlock(Guid id, CancellationToken ct)
    {
        var block = await _context.OpProcessSchedules.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (block == null)
            return NotFound();

        _context.OpProcessSchedules.Remove(block);
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<object> MapBlockAsync(Guid id, CancellationToken ct)
    {
        return await _context.OpProcessSchedules
            .AsNoTracking()
            .Include(b => b.ManufacturingOrder)
            .Where(b => b.Id == id)
            .Select(b => new
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
                notes = b.Notes,
                opNumber = b.ManufacturingOrder != null ? b.ManufacturingOrder.OpNumber : null,
                otNumber = b.ManufacturingOrder != null ? b.ManufacturingOrder.OtNumber : null,
                clientName = b.ManufacturingOrder != null ? b.ManufacturingOrder.ClientName : null,
                productName = b.ManufacturingOrder != null ? b.ManufacturingOrder.ProductName : null
            })
            .FirstAsync(ct);
    }

    private async Task<ActionResult?> ValidateBlockRequestAsync(UpsertScheduleBlockRequest request, Guid? currentId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ProcessCode))
            return BadRequest(new { message = "El proceso es obligatorio." });

        var processCode = request.ProcessCode.Trim();
        if (!ProductionProcessCatalog.All.Any(p => p.Code == processCode))
            return BadRequest(new { message = "Proceso no valido." });

        if (request.PlannedEnd < request.PlannedStart)
            return BadRequest(new { message = "La fecha fin debe ser posterior o igual a la fecha inicio." });

        var blockType = string.IsNullOrWhiteSpace(request.BlockType) ? OpScheduleBlockTypes.Op : request.BlockType.Trim();
        if (blockType == OpScheduleBlockTypes.Op)
        {
            if (request.ManufacturingOrderId == null || request.ManufacturingOrderId == Guid.Empty)
                return BadRequest(new { message = "La OP es obligatoria para bloques de produccion." });

            var moExists = await _context.ManufacturingOrders.AnyAsync(m => m.Id == request.ManufacturingOrderId && m.OpeningDate != null, ct);
            if (!moExists)
                return BadRequest(new { message = "La orden de produccion no existe o no esta abierta." });
        }

        return null;
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc)
            return value.Date;
        return DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);
    }

    private static DateTime NormalizeUtcEndOfDay(DateTime value)
    {
        var date = NormalizeUtc(value);
        return date.AddDays(1).AddTicks(-1);
    }

    private static IEnumerable<object> BuildWeeks(int year, int month, int daysInMonth)
    {
        var weekCount = (int)Math.Ceiling(daysInMonth / 7.0);
        for (var w = 0; w < weekCount; w++)
        {
            var startDay = w * 7 + 1;
            var endDay = Math.Min(startDay + 6, daysInMonth);
            yield return new
            {
                label = $"S{w + 1}",
                startDay,
                endDay,
                start = new DateTime(year, month, startDay, 0, 0, 0, DateTimeKind.Utc),
                end = new DateTime(year, month, endDay, 23, 59, 59, DateTimeKind.Utc)
            };
        }
    }

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
        string? Notes);
}