namespace Perlax.Modules.Production.Application.AreaExpense;

public record AreaExpenseCapturaDto(
    Guid Id,
    string Area,
    DateOnly ExpenseDate,
    Guid? RubroId,
    string RubroName,
    Guid? ProveedorId,
    string ProveedorName,
    string? Invoice,
    string? OpNumber,
    string? Description,
    decimal BaseAmount,
    decimal IvaAmount,
    decimal TotalAmount,
    string Status,
    string RegisteredBy,
    Guid? OvertimeGroupId,
    string? OvertimeJson,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record AreaExpenseCapturaRequest(
    DateOnly? ExpenseDate,
    Guid? RubroId,
    string? RubroName,
    Guid? ProveedorId,
    string? ProveedorName,
    string? Invoice,
    string? OpNumber,
    string? Description,
    decimal? BaseAmount,
    string? Status,
    string? RegisteredBy,
    Guid? OvertimeGroupId,
    string? OvertimeJson);

public record AreaExpenseOvertimeSegmentRequest(
    string? Category,
    string? Label,
    decimal? Hours,
    decimal? Amount,
    bool? IsHe,
    bool? CreatesExpense);

public record AreaExpenseOvertimeBatchRequest(
    DateOnly? ExpenseDate,
    string? RegisteredBy,
    string? Status,
    string? OpNumber,
    string? Note,
    string? DisplayName,
    Guid? OvertimeGroupId,
    object? OvertimeInput,
    List<AreaExpenseOvertimeSegmentRequest>? Segments);

public interface IAreaExpenseCaptureService
{
    Task<IReadOnlyList<AreaExpenseCapturaDto>> ListAsync(
        string area,
        int? year = null,
        int? month = null,
        string? rubro = null,
        string? status = null,
        CancellationToken ct = default);

    Task<AreaExpenseCapturaDto> GetAsync(string area, Guid id, CancellationToken ct = default);

    Task<AreaExpenseCapturaDto> CreateAsync(string area, AreaExpenseCapturaRequest request, CancellationToken ct = default);

    Task<AreaExpenseCapturaDto> UpdateAsync(string area, Guid id, AreaExpenseCapturaRequest request, CancellationToken ct = default);

    Task DeleteAsync(string area, Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<AreaExpenseCapturaDto>> CreateOvertimeBatchAsync(
        string area,
        AreaExpenseOvertimeBatchRequest request,
        CancellationToken ct = default);

    Task DeleteOvertimeGroupAsync(string area, Guid overtimeGroupId, CancellationToken ct = default);
}
