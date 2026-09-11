using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Overtime;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Domain.Overtime;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class OvertimePayrollService : IOvertimePayrollService
{
    private readonly ProductionDbContext _db;

    public OvertimePayrollService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<OvertimeCalculateResponse> CalculateAsync(OvertimeCalculateRequest request, CancellationToken ct = default)
    {
        if (request.Salary <= 0)
            throw new InvalidOperationException("El salario del personal es obligatorio para calcular la hora extra.");

        if (!TimeOnly.TryParse(request.StartTime, out var startTime) || !TimeOnly.TryParse(request.EndTime, out var endTime))
            throw new InvalidOperationException("Hora de inicio y fin obligatorias (HH:mm).");

        var workStart = request.Date.ToDateTime(startTime);
        var workEnd = OvertimeCalculator.ResolveEnd(workStart, endTime);
        var shift = await ResolveShiftAsync(request.UserId, request.Role, request.Date, startTime, ct);
        var types = MapTypes(request.HourTypes);
        var breakdown = OvertimeCalculator.Calculate(request.Salary, workStart, workEnd, shift, types);

        var shiftLabel = breakdown.Shift is null
            ? null
            : $"{breakdown.Shift.Start:HH\\:mm}-{breakdown.Shift.End:HH\\:mm}";

        return new OvertimeCalculateResponse(
            breakdown.Salary,
            breakdown.Divisor,
            breakdown.HourValue,
            shiftLabel,
            breakdown.Shift?.FromRoster == true,
            string.IsNullOrWhiteSpace(request.OpNumber) ? null : request.OpNumber.Trim(),
            string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            breakdown.Segments.Select(s => new OvertimeSegmentDto(
                s.Start, s.End, s.Hours, s.Kind.ToString(), s.Label, s.Category,
                s.CreatesExpense, s.IsHe, s.Factor, s.Amount)).ToList(),
            breakdown.TotalAmount);
    }

    private async Task<OrdinaryShift?> ResolveShiftAsync(
        Guid? userId, string? role, DateOnly date, TimeOnly workStart, CancellationToken ct)
    {
        if (!OvertimeCalculator.IsProductionOvertimeRole(role))
            return OvertimeCalculator.OfficeScheduleFor(date);

        var sundayOrHoliday = ColombianHolidays.IsSundayOrHoliday(date);
        var saturday = date.DayOfWeek == DayOfWeek.Saturday;
        if (sundayOrHoliday || saturday)
            return null;

        // Producción: la jornada ordinaria se ancla al inicio capturado
        // (07:00 → 16:30; antes de las 07:00 → +8h, p. ej. 06:00-14:00).
        var roster = await TryRosterShiftAsync(userId, date, ct);
        return OvertimeCalculator.ProductionShiftFromStart(workStart, fromRoster: roster is not null);
    }

    private async Task<OrdinaryShift?> TryRosterShiftAsync(Guid? userId, DateOnly date, CancellationToken ct)
    {
        if (userId is null) return null;

        var op = await _db.ProductionOperators.AsNoTracking()
            .FirstOrDefaultAsync(o => o.IsActive && o.UserId == userId, ct);
        if (op is null) return null;

        var monday = OpSchedulingService.NormalizeWeekStart(date.ToDateTime(TimeOnly.MinValue));
        var dow = date.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)date.DayOfWeek;

        var day = await _db.OpRosterDays.AsNoTracking()
            .Include(d => d.RosterRow)
            .Where(d => d.RosterRow != null
                && d.RosterRow.WeekStart == monday
                && d.RosterRow.OperatorId == op.Id
                && d.DayOfWeek == dow
                && !d.IsOff
                && d.ShiftId != null)
            .FirstOrDefaultAsync(ct);

        Guid? shiftId = day?.ShiftId;
        if (shiftId is null)
        {
            var coverage = await _db.OpCoverageAssignments.AsNoTracking()
                .FirstOrDefaultAsync(c =>
                    c.WeekStart == monday && c.OperatorId == op.Id && c.DayOfWeek == dow, ct);
            shiftId = coverage?.ShiftId;
        }

        if (shiftId is null) return null;

        var shift = await _db.ProductionShifts.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == shiftId, ct);
        if (shift is null) return null;

        return new OrdinaryShift(shift.StartTime, shift.EndTime, shift.CrossesMidnight, true);
    }

    private static IReadOnlyList<HourTypeFactor> MapTypes(IReadOnlyList<HourTypeInput>? inputs)
    {
        if (inputs is null || inputs.Count == 0)
            return OvertimeCalculator.DefaultHourTypes;

        return inputs
            .Where(t => !string.IsNullOrWhiteSpace(t.Name) && t.Factor > 0)
            .Select(t => new HourTypeFactor(
                string.IsNullOrWhiteSpace(t.Code) ? Slug(t.Name) : t.Code.Trim(),
                t.Name.Trim(),
                t.Factor))
            .ToList();
    }

    private static string Slug(string name) =>
        name.Trim().ToLowerInvariant().Replace(' ', '_');
}
