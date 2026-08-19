using Perlax.Modules.Production.Domain.Overtime;
using Xunit;

namespace Perlax.Modules.Production.UnitTests;

public class OvertimeCalculatorTests
{
    [Fact]
    public void Tuesday_shift_06_to_14_worked_06_to_16_is_two_hours_extra_diurna()
    {
        var start = new DateTime(2026, 8, 11, 6, 0, 0);
        var end = new DateTime(2026, 8, 11, 16, 0, 0);
        var shift = new OrdinaryShift(new TimeOnly(6, 0), new TimeOnly(14, 0), false, true);

        var result = OvertimeCalculator.Calculate(2_100_000m, start, end, shift);

        Assert.Equal(210m, result.Divisor);
        Assert.Equal(10_000m, result.HourValue);
        var extra = result.Segments.Where(s => s.CreatesExpense).ToList();
        Assert.Single(extra);
        Assert.Equal(OvertimeSegmentKind.ExtraDiurna, extra[0].Kind);
        Assert.Equal(2m, extra[0].Hours);
        Assert.Equal(1.25m, extra[0].Factor);
        Assert.Equal(25_000m, extra[0].Amount);
        Assert.Equal(25_000m, result.TotalAmount);
    }

    [Fact]
    public void Night_hours_inside_shift_are_surcharge_not_extra()
    {
        var start = new DateTime(2026, 8, 11, 19, 0, 0);
        var end = new DateTime(2026, 8, 11, 22, 0, 0);
        var shift = new OrdinaryShift(new TimeOnly(15, 0), new TimeOnly(23, 0), false, true);

        var result = OvertimeCalculator.Calculate(2_100_000m, start, end, shift);
        var paid = result.Segments.Where(s => s.CreatesExpense).ToList();

        Assert.Single(paid);
        Assert.Equal(OvertimeSegmentKind.RecargoNocturno, paid[0].Kind);
        Assert.False(paid[0].IsHe);
        Assert.Equal(3m, paid[0].Hours);
        Assert.Equal(10_500m, paid[0].Amount);
    }

    [Fact]
    public void Saturday_without_roster_is_all_extra()
    {
        var start = new DateTime(2026, 8, 15, 8, 0, 0);
        var end = new DateTime(2026, 8, 15, 12, 0, 0);

        var result = OvertimeCalculator.Calculate(2_100_000m, start, end, shift: null);
        var paid = result.Segments.Where(s => s.CreatesExpense).ToList();

        Assert.Single(paid);
        Assert.Equal(OvertimeSegmentKind.ExtraDiurna, paid[0].Kind);
        Assert.Equal(4m, paid[0].Hours);
        Assert.Equal(50_000m, paid[0].Amount);
    }

    [Fact]
    public void End_before_start_crosses_midnight()
    {
        var start = new DateTime(2026, 8, 11, 22, 0, 0);
        var end = OvertimeCalculator.ResolveEnd(start, new TimeOnly(2, 0));
        Assert.Equal(new DateTime(2026, 8, 12, 2, 0, 0), end);
    }
    [Fact]
    public void Office_monday_after_13_is_extra()
    {
        var date = new DateOnly(2026, 8, 10); // lunes
        var shift = OvertimeCalculator.OfficeScheduleFor(date);
        Assert.NotNull(shift);
        Assert.Equal(new TimeOnly(7, 0), shift!.Start);
        Assert.Equal(new TimeOnly(13, 0), shift.End);

        var start = date.ToDateTime(new TimeOnly(7, 0));
        var end = date.ToDateTime(new TimeOnly(16, 30));
        var result = OvertimeCalculator.Calculate(2_100_000m, start, end, shift);
        var extra = result.Segments.Where(s => s.CreatesExpense).ToList();
        Assert.Single(extra);
        Assert.Equal(OvertimeSegmentKind.ExtraDiurna, extra[0].Kind);
        Assert.Equal(3.5m, extra[0].Hours);
        Assert.Equal(43_750m, extra[0].Amount);
    }

    [Fact]
    public void Office_tuesday_to_friday_ends_at_1630()
    {
        var date = new DateOnly(2026, 8, 11); // martes
        var shift = OvertimeCalculator.OfficeScheduleFor(date);
        Assert.Equal(new TimeOnly(16, 30), shift!.End);

        var start = date.ToDateTime(new TimeOnly(7, 0));
        var end = date.ToDateTime(new TimeOnly(18, 0));
        var result = OvertimeCalculator.Calculate(2_100_000m, start, end, shift);
        var extra = result.Segments.Where(s => s.CreatesExpense).ToList();
        Assert.Single(extra);
        Assert.Equal(1.5m, extra[0].Hours);
        Assert.Equal(18_750m, extra[0].Amount);
    }

    [Fact]
    public void Operario_is_production_role_almacen_is_not()
    {
        Assert.True(OvertimeCalculator.IsProductionOvertimeRole("Operario"));
        Assert.True(OvertimeCalculator.IsProductionOvertimeRole("Auxiliar"));
        Assert.False(OvertimeCalculator.IsProductionOvertimeRole("Almacen"));
        Assert.False(OvertimeCalculator.IsProductionOvertimeRole("Taller"));
        Assert.False(OvertimeCalculator.IsProductionOvertimeRole("Administrativo"));
    }
}
