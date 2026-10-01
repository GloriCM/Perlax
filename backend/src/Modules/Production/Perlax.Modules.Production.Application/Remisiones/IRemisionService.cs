namespace Perlax.Modules.Production.Application.Remisiones;

public record RemisionListItemDto(
    Guid Id,
    string RemisionNumber,
    string CustomerOrderNumber,
    string ClientName,
    DateTime RemisionDate,
    string Status,
    decimal TotalQuantity,
    bool HasTransport,
    decimal TransportCost,
    Guid? InvoiceId,
    bool IsInvoiced);

public record RemisionItemDto(
    Guid Id,
    Guid CustomerOrderItemId,
    Guid? ManufacturingOrderId,
    Guid OrderPartId,
    string ProductName,
    string ReferenceName,
    decimal Quantity,
    decimal UnitPrice,
    string? DispatchNotes,
    bool IsFinalDispatch,
    string? FinalDispatchCode,
    decimal RemainingQuantity);

public record RemisionDetailDto(
    Guid Id,
    string RemisionNumber,
    Guid CustomerOrderId,
    string CustomerOrderNumber,
    string ClientName,
    DateTime RemisionDate,
    string Status,
    string? Notes,
    bool HasTransport,
    string? TransportCarrier,
    string? TransportPlate,
    string? TransportDriver,
    decimal TransportCost,
    string? TransportNotes,
    Guid? InvoiceId,
    IReadOnlyList<RemisionItemDto> Items);

public record RemisionItemCommand(
    Guid CustomerOrderItemId,
    decimal Quantity,
    string? DispatchNotes,
    bool IsFinalDispatch);

public record SaveRemisionCommand(
    Guid CustomerOrderId,
    DateTime RemisionDate,
    string? Notes,
    IReadOnlyList<RemisionItemCommand> Items);

public record AssignTransportCommand(
    string Carrier,
    string? Plate,
    string? Driver,
    decimal Cost,
    string? Notes);

public record DispatchableOrderDto(
    Guid CustomerOrderId,
    string OrderNumber,
    string ClientName,
    DateTime? AgreedDeliveryDate,
    IReadOnlyList<DispatchableItemDto> Items);

public record DispatchableItemDto(
    Guid CustomerOrderItemId,
    Guid OrderPartId,
    Guid ProductionOrderId,
    Guid? ManufacturingOrderId,
    string ProductName,
    string ReferenceName,
    decimal OrderedQuantity,
    decimal RemisionedQuantity,
    decimal RemainingQuantity,
    decimal UnitPrice);

public interface IRemisionService
{
    Task<string> GetNextNumberAsync(CancellationToken ct = default);
    Task<IReadOnlyList<RemisionListItemDto>> ListAsync(CancellationToken ct = default);
    Task<RemisionDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<DispatchableOrderDto>> GetDispatchableOrdersAsync(string? clientName = null, CancellationToken ct = default);
    Task<RemisionDetailDto> CreateAsync(SaveRemisionCommand command, string userName, CancellationToken ct = default);
    Task UpdateAsync(Guid id, SaveRemisionCommand command, string userName, CancellationToken ct = default);
    Task AssignTransportAsync(Guid id, AssignTransportCommand command, string userName, CancellationToken ct = default);
    Task DeleteAsync(Guid id, string userName, CancellationToken ct = default);
}
