namespace Perlax.Modules.Production.Application.CustomerOrders;

public record AvailableProductDto(Guid PartId, string OtNumber, string ProductName, string ReferenceName, string ClientName, decimal ApprovedUnitPrice);

public record CustomerOrderListItemDto(
    Guid Id,
    string OrderNumber,
    DateTime OrderDate,
    DateTime? DispatchDate,
    string ClientName,
    string PurchaseOrderNumber,
    string ProductName,
    string ReferenceName,
    decimal Quantity,
    decimal ApprovedUnitPrice,
    Guid OrderPartId,
    bool IsApproved);

public record CustomerOrderItemDto(Guid OrderPartId, decimal Quantity, decimal ApprovedUnitPrice, string ProductName, string ReferenceName);

public record CustomerOrderDetailDto(
    Guid Id,
    string OrderNumber,
    DateTime OrderDate,
    string ClientName,
    string PurchaseOrderNumber,
    DateTime? AgreedDeliveryDate,
    bool IsApproved,
    IReadOnlyList<CustomerOrderItemDto> Items);

public record SaveCustomerOrderItemCommand(Guid OrderPartId, decimal Quantity, decimal ApprovedUnitPrice, string? ProductName, string? ReferenceName);

public record SaveCustomerOrderCommand(
    string? OrderNumber,
    DateTime OrderDate,
    string ClientName,
    string PurchaseOrderNumber,
    DateTime? AgreedDeliveryDate,
    IReadOnlyList<SaveCustomerOrderItemCommand> Items);

public record ApproveCustomerOrderItemCommand(Guid OrderPartId, decimal ApprovedUnitPrice);

public record CreateCustomerOrderResultDto(Guid Id, string OrderNumber);

public interface ICustomerOrderService
{
    Task<IReadOnlyList<AvailableProductDto>> GetAvailableProductsAsync(CancellationToken ct = default);
    Task<string> GetNextNumberAsync(CancellationToken ct = default);
    Task<IReadOnlyList<CustomerOrderListItemDto>> ListAsync(CancellationToken ct = default);
    Task<CustomerOrderDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CreateCustomerOrderResultDto> CreateAsync(SaveCustomerOrderCommand command, string userName, CancellationToken ct = default);
    Task UpdateAsync(Guid id, SaveCustomerOrderCommand command, string userName, CancellationToken ct = default);
    Task ApproveAsync(Guid id, IReadOnlyList<ApproveCustomerOrderItemCommand> items, string userName, CancellationToken ct = default);
}