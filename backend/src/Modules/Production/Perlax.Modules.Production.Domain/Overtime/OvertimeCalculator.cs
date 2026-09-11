namespace Perlax.Modules.Production.Domain.Overtime;

public static class OvertimeCalculator
{
    public const decimal CommercialMonthHours = 210m;
    public static readonly TimeOnly NightStart = new(19, 0);
    public static readonly TimeOnly DayStart = new(6, 0);
    /// <summary>Almuerzo de media hora (12:00-12:30).</summary>
    public static readonly TimeOnly LunchStart = new(12, 0);
    public static readonly TimeOnly LunchEnd = new(12, 30);
    /// <summary>Duración de jornada si el turno inicia a las 07:00 o después (07:00 → 16:30).</summary>
    public static readonly TimeSpan LateMorningShiftLength = new(9, 30, 0);
    /// <summary>Duración de jornada clásica de planta (06:00 → 14:00).</summary>
    public static readonly TimeSpan EarlyMorningShiftLength = new(8, 0, 0);

    public static IReadOnlyList<HourTypeFactor> DefaultHourTypes { get; } =
    [
        new("extra_diurna", "Extra Diurna", 1.25m),
        new("extra_nocturna", "hora extra nocturna", 1.70m),
        new("extra_dominical", "Dominical o Festivo", 1.80m),
        new("recargo_nocturno", "Recargo Nocturno", 0.35m),
    ];

    public static decimal MonthlyDivisor(DateOnly date) => CommercialMonthHours;

    public static decimal HourValue(decimal salary, decimal divisor) =>
        divisor <= 0 ? 0 : Math.Round(salary / divisor, 4, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Jornada de oficina (planeación, talleres, administrativo y demás no-producción):
    /// lunes 07:00-13:00; martes a viernes 07:00-16:30. Sábado, domingo y festivo: sin jornada.
    /// </summary>
    public static OrdinaryShift? OfficeScheduleFor(DateOnly date)
    {
        if (ColombianHolidays.IsSundayOrHoliday(date) || date.DayOfWeek == DayOfWeek.Saturday)
            return null;

        if (date.DayOfWeek == DayOfWeek.Monday)
            return new OrdinaryShift(new TimeOnly(7, 0), new TimeOnly(13, 0), false, true);

        return new OrdinaryShift(new TimeOnly(7, 0), new TimeOnly(16, 30), false, true);
    }

    /// <summary>
    /// Jornada de producción anclada al inicio real del turno:
    /// 06:xx → +8h (p. ej. 06:00-14:00); desde 07:00 → +9.5h (p. ej. 07:00-16:30).
    /// </summary>
    public static OrdinaryShift ProductionShiftFromStart(TimeOnly workStart, bool fromRoster = false)
    {
        var length = workStart < new TimeOnly(7, 0)
            ? EarlyMorningShiftLength
            : LateMorningShiftLength;
        var end = workStart.Add(length);
        var crosses = end <= workStart && length > TimeSpan.Zero;
        return new OrdinaryShift(workStart, end, crosses, fromRoster);
    }

    public static bool IsProductionOvertimeRole(string? role)
    {
        var value = (role ?? string.Empty).Trim();
        return value.Equals("Operario", StringComparison.OrdinalIgnoreCase)
            || value.Equals("Auxiliar", StringComparison.OrdinalIgnoreCase);
    }

    public static OvertimeBreakdown Calculate(
        decimal salary,
        DateTime workStart,
        DateTime workEnd,
        OrdinaryShift? shift,
        IReadOnlyList<HourTypeFactor>? hourTypes = null)
    {
        if (workEnd <= workStart)
            throw new ArgumentException("La hora fin debe ser posterior a la hora inicio (o cruzar medianoche).");

        var types = hourTypes is { Count: > 0 } ? hourTypes : DefaultHourTypes;
        var date = DateOnly.FromDateTime(workStart);
        var divisor = MonthlyDivisor(date);
        var hourValue = HourValue(salary, divisor);
        var cuts = BuildCuts(workStart, workEnd, shift);
        var segments = new List<OvertimeSegment>();

        for (var i = 0; i < cuts.Count - 1; i++)
        {
            var a = cuts[i];
            var b = cuts[i + 1];
            if (b <= a) continue;
            segments.Add(Classify(a, b, shift, hourValue, types));
        }

        var paid = segments.Where(s => s.CreatesExpense).Sum(s => s.Amount);
        return new OvertimeBreakdown(salary, divisor, hourValue, shift, segments, paid);
    }

    public static DateTime ResolveEnd(DateTime start, TimeOnly endTime)
    {
        var end = start.Date.Add(endTime.ToTimeSpan());
        if (end <= start)
            end = end.AddDays(1);
        return end;
    }

    private static List<DateTime> BuildCuts(DateTime start, DateTime end, OrdinaryShift? shift)
    {
        var cuts = new SortedSet<DateTime> { start, end };
        for (var day = start.Date; day <= end.Date; day = day.AddDays(1))
        {
            AddIfInside(cuts, start, end, day);
            AddIfInside(cuts, start, end, day.Add(DayStart.ToTimeSpan()));
            AddIfInside(cuts, start, end, day.Add(NightStart.ToTimeSpan()));
            AddIfInside(cuts, start, end, day.Add(LunchStart.ToTimeSpan()));
            AddIfInside(cuts, start, end, day.Add(LunchEnd.ToTimeSpan()));
            if (shift is null) continue;
            var shiftStart = day.Add(shift.Start.ToTimeSpan());
            var shiftEnd = day.Add(shift.End.ToTimeSpan());
            if (shift.CrossesMidnight || shiftEnd <= shiftStart)
                shiftEnd = shiftEnd.AddDays(1);
            AddIfInside(cuts, start, end, shiftStart);
            AddIfInside(cuts, start, end, shiftEnd);
        }

        return [.. cuts];
    }

    private static void AddIfInside(SortedSet<DateTime> cuts, DateTime start, DateTime end, DateTime value)
    {
        if (value > start && value < end)
            cuts.Add(value);
    }

    private static OvertimeSegment Classify(
        DateTime start,
        DateTime end,
        OrdinaryShift? shift,
        decimal hourValue,
        IReadOnlyList<HourTypeFactor> types)
    {
        var hours = (decimal)(end - start).TotalHours;
        if (IsInsideLunch(start))
        {
            return new OvertimeSegment(
                start, end, Math.Round(hours, 4, MidpointRounding.AwayFromZero),
                OvertimeSegmentKind.Food, "COMIDA", "", false, false, 0, 0);
        }

        var day = DateOnly.FromDateTime(start);
        var inShift = shift is not null && IsInsideShift(start, shift);
        var night = IsNight(TimeOnly.FromDateTime(start));
        var sundayOrHoliday = ColombianHolidays.IsSundayOrHoliday(day);
        var saturday = day.DayOfWeek == DayOfWeek.Saturday;
        var hasRoster = shift?.FromRoster == true;

        OvertimeSegmentKind kind;
        if (sundayOrHoliday && !hasRoster)
            kind = night ? OvertimeSegmentKind.ExtraDominicalNocturna : OvertimeSegmentKind.ExtraDominicalDiurna;
        else if (saturday && !hasRoster)
            kind = night ? OvertimeSegmentKind.ExtraNocturna : OvertimeSegmentKind.ExtraDiurna;
        else if (inShift && night)
            kind = OvertimeSegmentKind.RecargoNocturno;
        else if (inShift)
            kind = OvertimeSegmentKind.Ordinary;
        else if (sundayOrHoliday)
            kind = night ? OvertimeSegmentKind.ExtraDominicalNocturna : OvertimeSegmentKind.ExtraDominicalDiurna;
        else
            kind = night ? OvertimeSegmentKind.ExtraNocturna : OvertimeSegmentKind.ExtraDiurna;

        var factor = FactorFor(kind, types);
        var creates = kind is not OvertimeSegmentKind.Ordinary and not OvertimeSegmentKind.Food;
        var isHe = kind is OvertimeSegmentKind.ExtraDiurna
            or OvertimeSegmentKind.ExtraNocturna
            or OvertimeSegmentKind.ExtraDominicalDiurna
            or OvertimeSegmentKind.ExtraDominicalNocturna;
        var category = kind == OvertimeSegmentKind.RecargoNocturno ? "Recargo"
            : isHe ? "Horas Extras"
            : "";
        var amount = creates
            ? Math.Round(hourValue * factor * hours, 0, MidpointRounding.AwayFromZero)
            : 0m;

        return new OvertimeSegment(
            start, end, Math.Round(hours, 4, MidpointRounding.AwayFromZero),
            kind, LabelFor(kind), category, creates, isHe, factor, amount);
    }

    public static bool IsInsideLunch(DateTime instant)
    {
        var tod = TimeOnly.FromDateTime(instant);
        return tod >= LunchStart && tod < LunchEnd;
    }

    public static bool IsNight(TimeOnly time) => time >= NightStart || time < DayStart;

    public static bool IsInsideShift(DateTime instant, OrdinaryShift shift)
    {
        var tod = TimeOnly.FromDateTime(instant);
        if (shift.CrossesMidnight || shift.End <= shift.Start)
            return tod >= shift.Start || tod < shift.End;
        return tod >= shift.Start && tod < shift.End;
    }

    public static decimal FactorFor(OvertimeSegmentKind kind, IReadOnlyList<HourTypeFactor> types)
    {
        var extraDiurna = Find(types, "extra_diurna", "diurna") ?? 1.25m;
        var extraNocturna = Find(types, "extra_nocturna", "nocturna") ?? 1.70m;
        var dominical = Find(types, "extra_dominical", "dominical")
            ?? Find(types, "festivo", "festiv")
            ?? 1.80m;
        var recargo = Find(types, "recargo_nocturno", "recargo") ?? 0.35m;

        return kind switch
        {
            OvertimeSegmentKind.ExtraDiurna => extraDiurna,
            OvertimeSegmentKind.ExtraNocturna => extraNocturna,
            OvertimeSegmentKind.ExtraDominicalDiurna => dominical,
            OvertimeSegmentKind.ExtraDominicalNocturna => extraNocturna > dominical ? extraNocturna : dominical,
            OvertimeSegmentKind.RecargoNocturno => recargo,
            _ => 0m
        };
    }

    private static decimal? Find(IReadOnlyList<HourTypeFactor> types, string code, string token)
    {
        var byCode = types.FirstOrDefault(t => t.Code.Equals(code, StringComparison.OrdinalIgnoreCase));
        if (byCode is not null) return byCode.Factor;

        var wantRecargo = code.Contains("recargo", StringComparison.OrdinalIgnoreCase);
        var byName = types.FirstOrDefault(t =>
        {
            var name = t.Name;
            var isRecargo = name.Contains("recargo", StringComparison.OrdinalIgnoreCase);
            if (wantRecargo != isRecargo) return false;
            return name.Contains(token, StringComparison.OrdinalIgnoreCase);
        });
        return byName?.Factor;
    }

    private static string LabelFor(OvertimeSegmentKind kind) => kind switch
    {
        OvertimeSegmentKind.Ordinary => "Jornada ordinaria",
        OvertimeSegmentKind.Food => "COMIDA",
        OvertimeSegmentKind.ExtraDiurna => "Extra Diurna",
        OvertimeSegmentKind.ExtraNocturna => "Extra nocturna",
        OvertimeSegmentKind.ExtraDominicalDiurna => "Extra dominical/festiva diurna",
        OvertimeSegmentKind.ExtraDominicalNocturna => "Extra dominical/festiva nocturna",
        OvertimeSegmentKind.RecargoNocturno => "Recargo nocturno",
        _ => kind.ToString()
    };
}
