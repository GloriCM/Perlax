using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Scheduling;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed partial class OpSchedulingService
{
    public async Task<BillingSummaryDto> GetBillingSummaryAsync(int? year = null, int? month = null, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        if (m < 1 || m > 12)
            throw new InvalidOperationException("Mes invalido.");

        var daysInMonth = DateTime.DaysInMonth(y, m);
        var monthStart = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);

        var goalRow = await _db.OpBillingMonthGoals.AsNoTracking()
            .FirstOrDefaultAsync(g => g.Year == y && g.Month == m, ct);
        var monthlyGoal = goalRow?.MonthlyGoal ?? 0m;

        var blocks = await _db.OpProcessSchedules.AsNoTracking()
            .Include(b => b.ManufacturingOrder)
            .Where(b => b.BlockType == OpScheduleBlockTypes.Op && b.ManufacturingOrderId != null)
            .Where(b => b.PlannedStart <= monthEnd && b.PlannedEnd >= monthStart)
            .ToListAsync(ct);

        var weekCount = (int)Math.Ceiling(daysInMonth / 7.0);
        var baseMeta = weekCount > 0 ? Math.Round(monthlyGoal / weekCount, 2) : 0m;
        var carry = 0m;
        var weeks = new List<BillingWeekDto>();

        for (var w = 0; w < weekCount; w++)
        {
            var startDay = w * 7 + 1;
            var endDay = Math.Min(startDay + 6, daysInMonth);
            var weekStart = new DateTime(y, m, startDay, 0, 0, 0, DateTimeKind.Utc);
            var weekEnd = new DateTime(y, m, endDay, 23, 59, 59, DateTimeKind.Utc);

            var counted = new HashSet<Guid>();
            var generated = 0m;
            foreach (var block in blocks)
            {
                if (block.ManufacturingOrderId == null || block.ManufacturingOrder == null) continue;
                if (block.PlannedStart > weekEnd || block.PlannedEnd < weekStart) continue;
                if (!counted.Add(block.ManufacturingOrderId.Value)) continue;
                generated += block.ManufacturingOrder.ApprovedUnitPrice * block.ManufacturingOrder.QuantityToProduce;
            }
            generated = Math.Round(generated, 2);

            var totalMeta = Math.Round(baseMeta + carry, 2);
            var delta = Math.Round(generated - totalMeta, 2);
            carry = Math.Max(0m, Math.Round(totalMeta - generated, 2));

            weeks.Add(new BillingWeekDto(w, $"S{w + 1}", startDay, endDay, generated, baseMeta, totalMeta, delta, carry));
        }

        return new BillingSummaryDto(y, m, monthlyGoal, weekCount, baseMeta, weeks);
    }

    public async Task<BillingMetaDto> GetBillingMetaAsync(int? year = null, int? month = null, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        if (m < 1 || m > 12)
            throw new InvalidOperationException("Mes invalido.");

        var row = await _db.OpBillingMonthGoals.AsNoTracking()
            .FirstOrDefaultAsync(g => g.Year == y && g.Month == m, ct);

        var daysInMonth = DateTime.DaysInMonth(y, m);
        var weekCount = (int)Math.Ceiling(daysInMonth / 7.0);

        return new BillingMetaDto(y, m, row?.MonthlyGoal ?? 0m, weekCount);
    }

    public async Task<BillingMetaDto> SetBillingMetaAsync(int year, int month, decimal monthlyGoal, string userName, CancellationToken ct = default)
    {
        if (month < 1 || month > 12)
            throw new InvalidOperationException("Mes invalido.");
        if (monthlyGoal < 0)
            throw new InvalidOperationException("La meta no puede ser negativa.");

        var row = await _db.OpBillingMonthGoals
            .FirstOrDefaultAsync(g => g.Year == year && g.Month == month, ct);

        if (row == null)
        {
            row = new OpBillingMonthGoal
            {
                Id = Guid.NewGuid(),
                Year = year,
                Month = month,
                MonthlyGoal = monthlyGoal,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userName
            };
            _db.OpBillingMonthGoals.Add(row);
        }
        else
        {
            row.MonthlyGoal = monthlyGoal;
            row.UpdatedAt = DateTime.UtcNow;
            row.UpdatedBy = userName;
        }

        await _db.SaveChangesAsync(ct);
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var weekCount = (int)Math.Ceiling(daysInMonth / 7.0);
        return new BillingMetaDto(row.Year, row.Month, row.MonthlyGoal, weekCount);
    }
}