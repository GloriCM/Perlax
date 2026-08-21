using Perlax.Modules.Production.Domain.Overtime;

namespace Perlax.Modules.Production.Application.Overtime;

public record HourTypeInput(string? Code, string Name, decimal Factor);

public record OvertimeCalculateRequest(
    Guid? UserId,
    decimal Salary,
    DateOnly Date,
    string StartTime,
    string EndTime,
    string? Role,
    string? OpNumber,
    string? Note,
    IReadOnlyList<HourTypeInput>? HourTypes);

public record OvertimeSegmentDto(
    DateTime Start,
    DateTime End,
    decimal Hours,
    string Kind,
    string Label,
    string Category,
    bool CreatesExpense,
    bool IsHe,
    decimal Factor,
    decimal Amount);

public record OvertimeCalculateResponse(
    decimal Salary,
    decimal Divisor,
    decimal HourValue,
    string? ShiftLabel,
    bool FromRoster,
    string? OpNumber,
    string? Note,
    IReadOnlyList<OvertimeSegmentDto> Segments,
    decimal TotalAmount);

public interface IOvertimePayrollService
{
    Task<OvertimeCalculateResponse> CalculateAsync(OvertimeCalculateRequest request, CancellationToken ct = default);
}
