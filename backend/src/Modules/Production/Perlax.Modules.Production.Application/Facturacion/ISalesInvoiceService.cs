namespace Perlax.Modules.Production.Application.Facturacion;

public record SalesInvoiceListItemDto(
    Guid Id,
    string InvoiceNumber,
    string? LegacyInvoiceNumber,
    string RemisionNumber,
    string ClientName,
    DateTime InvoiceDate,
    DateTime? DueDate,
    string Status,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalAmount);

public record SalesInvoiceItemDto(
    Guid Id,
    Guid RemisionItemId,
    string ProductName,
    string ReferenceName,
    decimal Quantity,
    decimal UnitPrice,
    decimal LineTotal);

public record SalesInvoiceDetailDto(
    Guid Id,
    string InvoiceNumber,
    string? LegacyInvoiceNumber,
    Guid RemisionId,
    string RemisionNumber,
    string ClientName,
    DateTime InvoiceDate,
    DateTime? DueDate,
    string Status,
    string? Notes,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal TaxRate,
    IReadOnlyList<SalesInvoiceItemDto> Items);

public record CreateSalesInvoiceCommand(
    Guid RemisionId,
    DateTime InvoiceDate,
    DateTime? DueDate,
    string? Notes,
    decimal? TaxRate);

public record UpdateSalesInvoiceCommand(
    DateTime InvoiceDate,
    DateTime? DueDate,
    string? Notes);

public record PendingRemisionForInvoiceDto(
    Guid RemisionId,
    string RemisionNumber,
    string ClientName,
    DateTime RemisionDate,
    decimal TotalQuantity,
    decimal EstimatedSubtotal);

public interface ISalesInvoiceService
{
    Task<string> GetNextNumberAsync(CancellationToken ct = default);
    Task<IReadOnlyList<SalesInvoiceListItemDto>> ListAsync(CancellationToken ct = default);
    Task<SalesInvoiceDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<PendingRemisionForInvoiceDto>> GetPendingRemisionesAsync(string? clientName = null, CancellationToken ct = default);
    Task<SalesInvoiceDetailDto> CreateAsync(CreateSalesInvoiceCommand command, string userName, CancellationToken ct = default);
    Task UpdateAsync(Guid id, UpdateSalesInvoiceCommand command, string userName, CancellationToken ct = default);
    Task VoidAsync(Guid id, string userName, CancellationToken ct = default);
}
