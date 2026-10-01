namespace Perlax.Modules.Production.Application.InventarioPt;

public record FinishedGoodsBalanceDto(
    Guid ManufacturingOrderId,
    string OpNumber,
    string OrderNumber,
    string ClientName,
    string ProductName,
    string ReferenceName,
    decimal QuantityToProduce,
    decimal ProducedQuantity,
    decimal RemisionedQuantity,
    decimal ReturnedQuantity,
    decimal AvailableQuantity,
    string Status);

public record FinishedGoodsEntryDto(
    Guid Id,
    Guid ManufacturingOrderId,
    DateTime EntryDate,
    decimal Quantity,
    string? Notes,
    string? CreatedBy);

public record AddFinishedGoodsEntryCommand(
    Guid ManufacturingOrderId,
    DateTime EntryDate,
    decimal Quantity,
    string? Notes);

public record FinishedGoodsReturnDto(
    Guid Id,
    string ReturnNumber,
    Guid ManufacturingOrderId,
    Guid? RemisionId,
    Guid? RemisionItemId,
    string OpNumber,
    string ClientName,
    string ProductName,
    string ReferenceName,
    decimal Quantity,
    DateTime ReturnDate,
    string? Reason,
    string? Notes,
    string? CreatedBy);

public record AddFinishedGoodsReturnCommand(
    Guid ManufacturingOrderId,
    Guid? RemisionId,
    Guid? RemisionItemId,
    DateTime ReturnDate,
    decimal Quantity,
    string? Reason,
    string? Notes);

public record ReturnableDispatchDto(
    Guid ManufacturingOrderId,
    Guid? RemisionId,
    Guid? RemisionItemId,
    string RemisionNumber,
    string OpNumber,
    string ClientName,
    string ProductName,
    string ReferenceName,
    decimal RemisionedQuantity,
    decimal AlreadyReturned,
    decimal ReturnableQuantity);

public interface IFinishedGoodsService
{
    Task<IReadOnlyList<FinishedGoodsBalanceDto>> ListBalancesAsync(bool onlyWithStock = true, CancellationToken ct = default);
    Task<IReadOnlyList<FinishedGoodsEntryDto>> ListEntriesAsync(Guid manufacturingOrderId, CancellationToken ct = default);
    Task<FinishedGoodsEntryDto> AddEntryAsync(AddFinishedGoodsEntryCommand command, string userName, CancellationToken ct = default);

    Task<string> GetNextReturnNumberAsync(CancellationToken ct = default);
    Task<IReadOnlyList<FinishedGoodsReturnDto>> ListReturnsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ReturnableDispatchDto>> ListReturnableAsync(CancellationToken ct = default);
    Task<FinishedGoodsReturnDto> AddReturnAsync(AddFinishedGoodsReturnCommand command, string userName, CancellationToken ct = default);
}
