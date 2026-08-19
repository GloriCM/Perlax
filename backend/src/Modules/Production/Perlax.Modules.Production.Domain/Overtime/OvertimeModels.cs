namespace Perlax.Modules.Production.Domain.Overtime;

public enum OvertimeSegmentKind
{
    Ordinary,
    Food,
    ExtraDiurna,
    ExtraNocturna,
    ExtraDominicalDiurna,
    ExtraDominicalNocturna,
    RecargoNocturno
}

public record HourTypeFactor(string Code, string Name, decimal Factor);

public record OrdinaryShift(TimeOnly Start, TimeOnly End, bool CrossesMidnight, bool FromRoster);

public record OvertimeSegment(
    DateTime Start,
    DateTime End,
    decimal Hours,
    OvertimeSegmentKind Kind,
    string Label,
    string Category,
    bool CreatesExpense,
    bool IsHe,
    decimal Factor,
    decimal Amount);

public record OvertimeBreakdown(
    decimal Salary,
    decimal Divisor,
    decimal HourValue,
    OrdinaryShift? Shift,
    IReadOnlyList<OvertimeSegment> Segments,
    decimal TotalAmount);
