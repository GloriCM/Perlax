namespace Perlax.Modules.Production.Application.Inventory;

public record InventoryConsumptionDto(
    Guid Id,
    string ApplicationNumber,
    Guid ManufacturingOrderId,
    string OpNumber,
    Guid? ProductId,
    string ProductName,
    decimal Quantity,
    string Unit,
    decimal UnitCost,
    string DeliveredTo,
    DateTime ApplicationDate,
    string? Notes);

public record SaveConsumptionCommand(
    Guid ManufacturingOrderId,
    Guid? ProductId,
    string ProductName,
    decimal Quantity,
    string Unit,
    decimal UnitCost,
    string DeliveredTo,
    DateTime ApplicationDate,
    string? Notes);

public record StockBalanceDto(
    Guid? ProductId,
    string ProductName,
    decimal Purchased,
    decimal Consumed,
    decimal Available,
    decimal LastUnitCost);

public record StockMovementDto(
    Guid Id,
    string ProductName,
    string MovementType,
    decimal Quantity,
    decimal UnitCost,
    string? Reference,
    DateTime MovementDate,
    string? CreatedBy);

public interface IInventoryConsumptionService
{
    Task<string> GetNextNumberAsync(CancellationToken ct = default);
    Task<IReadOnlyList<InventoryConsumptionDto>> ListAsync(Guid? manufacturingOrderId = null, CancellationToken ct = default);
    Task<InventoryConsumptionDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<InventoryConsumptionDto> CreateAsync(SaveConsumptionCommand command, string userName, CancellationToken ct = default);
    Task UpdateAsync(Guid id, SaveConsumptionCommand command, string userName, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<InventoryConsumptionDto>> ListByOpAsync(Guid manufacturingOrderId, CancellationToken ct = default);
    Task<IReadOnlyList<StockBalanceDto>> ListStockBalancesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<StockMovementDto>> ListMovementsAsync(string? productName = null, CancellationToken ct = default);
    Task RegisterPurchaseEntryAsync(string productName, Guid? productId, decimal quantity, decimal unitCost, string? reference, string userName, CancellationToken ct = default);
}
