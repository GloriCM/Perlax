using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Scheduling;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed partial class OpSchedulingService : IOpSchedulingService
{
    private readonly ProductionDbContext _db;

    public OpSchedulingService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ScheduleBlockDto>> GetMachineScheduleAsync(
        Guid machineId,
        DateOnly? date = null,
        CancellationToken ct = default)
    {
        if (machineId == Guid.Empty)
            throw new InvalidOperationException("Maquina obligatoria.");

        var day = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var dayStart = new DateTime(day.Year, day.Month, day.Day, 0, 0, 0, DateTimeKind.Utc);
        var dayEnd = dayStart.AddDays(1).AddTicks(-1);
        return await QueryBlocksAsync(dayStart, dayEnd, machineId: machineId, ct: ct);
    }

    public async Task<GanttMonthDto> GetGanttAsync(
        int year,
        int month,
        string? q = null,
        string? status = null,
        CancellationToken ct = default)
    {
        if (month < 1 || month > 12)
            throw new InvalidOperationException("Mes invalido.");

        var monthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var blocks = await QueryBlocksAsync(monthStart, monthEnd, q, status, ct: ct);
        var processes = await GetActiveProcessesAsync(ct);

        return new GanttMonthDto(
            year,
            month,
            monthStart,
            monthEnd,
            daysInMonth,
            BuildWeeks(year, month, daysInMonth),
            processes,
            blocks);
    }

    public async Task<IReadOnlyList<OpScheduleListGroupDto>> GetMonthListAsync(
        int year,
        int month,
        string? q = null,
        string? status = null,
        CancellationToken ct = default)
    {
        var monthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
        var blocks = await QueryBlocksAsync(monthStart, monthEnd, q, status, ct: ct);

        return blocks
            .Where(b => b.BlockType == OpScheduleBlockTypes.Op && b.ManufacturingOrderId != null)
            .GroupBy(b => b.ManufacturingOrderId!.Value)
            .Select(g =>
            {
                var processRows = g.OrderBy(x => x.SortOrder).ThenBy(x => x.PlannedStart).ToList();
                var first = processRows[0];
                return new OpScheduleListGroupDto(
                    g.Key,
                    first.OpNumber,
                    first.OtNumber,
                    first.ClientName,
                    first.ProductName,
                    first.ReferenceName,
                    processRows.Any(x => x.IsUrgency),
                    ResolveGeneralStatus(processRows.Select(x => x.Status).ToList()),
                    processRows.Min(x => x.PlannedStart),
                    processRows.Max(x => x.PlannedEnd),
                    processRows.Count,
                    processRows);
            })
            .OrderBy(x => x.PlannedStart)
            .ToList();
    }

    public async Task<IReadOnlyList<OpenOrderDto>> GetOpenOrdersAsync(string? q = null, CancellationToken ct = default)
    {
        var query = _db.ManufacturingOrders.AsNoTracking()
            .Where(m => m.OpeningDate != null && m.Status != "Cerrada");

        var term = NormalizeTerm(q);
        if (term != null)
        {
            query = query.Where(m =>
                m.OpNumber.ToLower().Contains(term) ||
                m.OtNumber.ToLower().Contains(term) ||
                m.ClientName.ToLower().Contains(term) ||
                m.OrderNumber.ToLower().Contains(term));
        }

        var rows = await query
            .OrderByDescending(m => m.OpeningDate)
            .ThenBy(m => m.OpNumber)
            .Take(200)
            .Select(m => new
            {
                m.Id,
                m.OpNumber,
                m.OtNumber,
                m.ClientName,
                m.ProductName,
                m.ReferenceName,
                m.QuantityToProduce,
                HasSchedule = _db.OpProcessSchedules.Any(b =>
                    b.ManufacturingOrderId == m.Id && b.BlockType == OpScheduleBlockTypes.Op)
            })
            .ToListAsync(ct);

        return rows.Select(m => new OpenOrderDto(
            m.Id, m.OpNumber, m.OtNumber, m.ClientName, m.ProductName, m.ReferenceName,
            m.QuantityToProduce, m.HasSchedule)).ToList();
    }

    public async Task<OpenOrderPrefillDto> GetOpenOrderPrefillAsync(Guid manufacturingOrderId, CancellationToken ct = default)
    {
        var mo = await _db.ManufacturingOrders.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == manufacturingOrderId, ct)
            ?? throw new KeyNotFoundException("Orden no encontrada.");

        var existing = await _db.OpProcessSchedules.AsNoTracking()
            .Where(b => b.ManufacturingOrderId == manufacturingOrderId)
            .OrderBy(b => b.SortOrder)
            .ThenBy(b => b.PlannedStart)
            .Select(b => new ScheduleBlockDto(
                b.Id, b.ManufacturingOrderId, b.ProcessCode, b.MachineId, b.BlockType,
                b.PlannedStart, b.PlannedEnd, b.Status, b.SortOrder, b.IsUrgency, b.EstimatedHours, b.Notes,
                null, null, null, null, null))
            .ToListAsync(ct);

        var parts = await _db.OrderParts.AsNoTracking()
            .Where(p => p.ProductionOrderId == mo.ProductionOrderId)
            .ToListAsync(ct);
        if (parts.Count == 0)
        {
            var one = await _db.OrderParts.AsNoTracking()
                .Where(p => p.Id == mo.OrderPartId)
                .ToListAsync(ct);
            parts = one;
        }

        var catalogLabels = await _db.OpProcessCatalogItems.AsNoTracking()
            .ToDictionaryAsync(p => p.Code, p => p.Label, ct);

        var suggested = parts
            .SelectMany(p => MapSuggestedProcesses(p.FabricationProcessesJson, catalogLabels, p.PartName))
            .ToList();

        return new OpenOrderPrefillDto(
            mo.Id, mo.OpNumber, mo.OtNumber, mo.ClientName, mo.ProductName, mo.ReferenceName,
            mo.PurchaseOrderNumber, mo.AgreedDeliveryDate, mo.QuantityToProduce, mo.ApprovedUnitPrice,
            mo.Status, existing, suggested);
    }

    public static IReadOnlyList<SuggestedOpProcessDto> MapSuggestedProcesses(
        string? fabricationProcessesJson,
        IReadOnlyDictionary<string, string> catalogLabels,
        string? partName = null)
    {
        if (string.IsNullOrWhiteSpace(fabricationProcessesJson))
            return [];

        try
        {
            using var doc = JsonDocument.Parse(fabricationProcessesJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
                return [];

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var list = new List<SuggestedOpProcessDto>();
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var machine = ReadJsonString(el, "machine");
                var notes = ReadJsonString(el, "notes");
                var rowPart = ReadJsonString(el, "partName") ?? partName;
                var explicitCode = ReadJsonString(el, "processCode") ?? ReadJsonString(el, "process");
                var code = catalogLabels.ContainsKey(explicitCode ?? string.Empty)
                    ? explicitCode
                    : ExpertisProcessCatalogMapper.MapToCatalogCode(machine, notes);
                if (string.IsNullOrWhiteSpace(code))
                    continue;
                var key = $"{rowPart}|{code}";
                if (!seen.Add(key))
                    continue;
                var label = catalogLabels.GetValueOrDefault(code, code);
                list.Add(new SuggestedOpProcessDto(code, label, machine, notes, rowPart));
            }
            return list;
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string? ReadJsonString(JsonElement el, string name)
    {
        if (el.ValueKind != JsonValueKind.Object) return null;
        if (!el.TryGetProperty(name, out var p)) return null;
        return p.ValueKind == JsonValueKind.String ? p.GetString() : p.ToString();
    }

    private async Task<IReadOnlyList<ScheduleBlockDto>> QueryBlocksAsync(
        DateTime rangeStart,
        DateTime rangeEnd,
        string? q = null,
        string? status = null,
        Guid? machineId = null,
        CancellationToken ct = default)
    {
        var blocksQuery = _db.OpProcessSchedules.AsNoTracking()
            .Where(b => b.PlannedStart <= rangeEnd && b.PlannedEnd >= rangeStart);

        if (machineId.HasValue)
            blocksQuery = blocksQuery.Where(b => b.MachineId == machineId.Value);

        var term = NormalizeTerm(q);
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

        if (!string.IsNullOrWhiteSpace(status)
            && !string.Equals(status.Trim(), "Todos", StringComparison.OrdinalIgnoreCase))
        {
            var statusFilter = status.Trim();
            blocksQuery = blocksQuery.Where(b => b.Status == statusFilter);
        }

        return await blocksQuery
            .Include(b => b.ManufacturingOrder)
            .OrderBy(b => b.ProcessCode)
            .ThenBy(b => b.PlannedStart)
            .ThenBy(b => b.SortOrder)
            .Select(b => MapBlock(b))
            .ToListAsync(ct);
    }

    private static ScheduleBlockDto MapBlock(OpProcessSchedule b) => new(
        b.Id,
        b.ManufacturingOrderId,
        b.ProcessCode,
        b.MachineId,
        b.BlockType,
        b.PlannedStart,
        b.PlannedEnd,
        b.Status,
        b.SortOrder,
        b.IsUrgency,
        b.EstimatedHours,
        b.Notes,
        b.ManufacturingOrder != null ? b.ManufacturingOrder.OpNumber : null,
        b.ManufacturingOrder != null ? b.ManufacturingOrder.OtNumber : null,
        b.ManufacturingOrder != null ? b.ManufacturingOrder.ClientName : null,
        b.ManufacturingOrder != null ? b.ManufacturingOrder.ProductName : null,
        b.ManufacturingOrder != null ? b.ManufacturingOrder.ReferenceName : null);

    private async Task<ScheduleBlockDto> MapBlockByIdAsync(Guid id, CancellationToken ct)
    {
        var row = await _db.OpProcessSchedules.AsNoTracking()
            .Include(b => b.ManufacturingOrder)
            .FirstAsync(b => b.Id == id, ct);
        return MapBlock(row);
    }

    private static IReadOnlyList<GanttWeekDto> BuildWeeks(int year, int month, int daysInMonth)
    {
        var weekCount = (int)Math.Ceiling(daysInMonth / 7.0);
        var weeks = new List<GanttWeekDto>(weekCount);
        var monthShort = new DateTime(year, month, 1).ToString("MMM");
        for (var w = 0; w < weekCount; w++)
        {
            var startDay = w * 7 + 1;
            var endDay = Math.Min(startDay + 6, daysInMonth);
            weeks.Add(new GanttWeekDto(w, $"S{w + 1}", startDay, endDay, $"{startDay}-{endDay} {monthShort}"));
        }
        return weeks;
    }

    private static string? NormalizeTerm(string? q) =>
        string.IsNullOrWhiteSpace(q) ? null : q.Trim().ToLowerInvariant();

    private static string ResolveGeneralStatus(IReadOnlyList<string> statuses)
    {
        if (statuses.Any(s => s == OpScheduleStatuses.Cancelled)) return OpScheduleStatuses.Cancelled;
        if (statuses.All(s => s == OpScheduleStatuses.Done)) return OpScheduleStatuses.Done;
        if (statuses.Any(s => s == OpScheduleStatuses.InProgress)) return OpScheduleStatuses.InProgress;
        if (statuses.All(s => s == OpScheduleStatuses.Scheduled)) return OpScheduleStatuses.Scheduled;
        return OpScheduleStatuses.InProgress;
    }

    private static DateTime NormalizeUtc(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        if (utc.TimeOfDay != TimeSpan.Zero) return utc;
        return utc.Date;
    }

    private static DateTime NormalizeUtcEndOfDay(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        if (utc.TimeOfDay != TimeSpan.Zero) return utc;
        return utc.Date.AddDays(1).AddTicks(-1);
    }

    private static string SlugProcessCode(string value)
    {
        var cleaned = Regex.Replace(value.Trim(), @"[^a-zA-Z0-9\s]", "");
        var parts = cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Concat(parts.Select(p => char.ToUpperInvariant(p[0]) + p[1..].ToLowerInvariant()));
    }

    private static decimal ShiftHours(TimeOnly start, TimeOnly end, bool crossesMidnight)
    {
        var startMin = start.Hour * 60 + start.Minute;
        var endMin = end.Hour * 60 + end.Minute;
        if (crossesMidnight && endMin <= startMin) endMin += 24 * 60;
        if (endMin < startMin) endMin += 24 * 60;
        return Math.Round((endMin - startMin) / 60m, 1);
    }

    internal static DateTime NormalizeWeekStart(DateTime value)
    {
        var date = value.Kind == DateTimeKind.Utc ? value.Date : DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);
        var dow = (int)date.DayOfWeek;
        var mondayOffset = dow == 0 ? -6 : 1 - dow;
        return date.AddDays(mondayOffset);
    }

    internal static string FormatShiftLabel(TimeOnly start, TimeOnly end) =>
        $"{start:HH:mm} - {end:HH:mm}";

    private static int DayOfWeekToRosterIndex(DateTime date)
    {
        var dow = (int)date.DayOfWeek;
        return dow == 0 ? 7 : dow;
    }
}