namespace Perlax.Modules.Production.Application.OpDetail;

public record OpMaterialLineDto(
    Guid Id,
    string PartName,
    string Category,
    Guid? ProductId,
    string ProductName,
    decimal Quantity,
    string Unit,
    decimal UnitCost,
    string? Notes);

public record OpLaborProcessDto(
    Guid Id,
    string PartName,
    string WorkStation,
    string? Observations,
    decimal Quantity,
    decimal? RollWidth,
    decimal? CutLength,
    decimal? SheetWidth,
    decimal? SheetLength,
    decimal? Cabida);

public record OpExternalWorkshopDto(
    Guid Id,
    string WorkshopName,
    string WorkType,
    DateTime? DeliveryToWorkshopDate,
    decimal QuantityDelivered,
    decimal Fajado,
    decimal Estresado,
    decimal Empacado,
    decimal UnitPrice,
    string? Observations,
    DateTime? ReturnDate,
    decimal? ReturnQuantity);

public record SaveOpMaterialCommand(
    string PartName,
    string Category,
    Guid? ProductId,
    string ProductName,
    decimal Quantity,
    string Unit,
    decimal UnitCost,
    string? Notes);

public record SaveOpLaborCommand(
    string PartName,
    string WorkStation,
    string? Observations,
    decimal Quantity,
    decimal? RollWidth,
    decimal? CutLength,
    decimal? SheetWidth,
    decimal? SheetLength,
    decimal? Cabida);

public record SaveOpWorkshopCommand(
    string WorkshopName,
    string WorkType,
    DateTime? DeliveryToWorkshopDate,
    decimal QuantityDelivered,
    decimal Fajado,
    decimal Estresado,
    decimal Empacado,
    decimal UnitPrice,
    string? Observations,
    DateTime? ReturnDate,
    decimal? ReturnQuantity);

public record OpCostSummaryDto(
    Guid ManufacturingOrderId,
    string OpNumber,
    decimal MaterialsCost,
    decimal WorkshopsCost,
    decimal TransportCost,
    decimal ConsumptionsCost,
    decimal TotalCost,
    decimal ApprovedUnitPrice,
    decimal QuantityToProduce,
    decimal EstimatedSale,
    DateTime? ProductionDeliveryDate,
    DateTime? AgreedDeliveryDate,
    DateTime? ClosedAt,
    string Status);

public interface IOpDetailService
{
    Task<IReadOnlyList<OpMaterialLineDto>> ListMaterialsAsync(Guid manufacturingOrderId, CancellationToken ct = default);
    Task<OpMaterialLineDto> AddMaterialAsync(Guid manufacturingOrderId, SaveOpMaterialCommand command, string userName, CancellationToken ct = default);
    Task DeleteMaterialAsync(Guid manufacturingOrderId, Guid lineId, CancellationToken ct = default);

    Task<IReadOnlyList<OpLaborProcessDto>> ListLaborAsync(Guid manufacturingOrderId, CancellationToken ct = default);
    Task<OpLaborProcessDto> AddLaborAsync(Guid manufacturingOrderId, SaveOpLaborCommand command, string userName, CancellationToken ct = default);
    Task DeleteLaborAsync(Guid manufacturingOrderId, Guid lineId, CancellationToken ct = default);

    Task<IReadOnlyList<OpExternalWorkshopDto>> ListWorkshopsAsync(Guid manufacturingOrderId, CancellationToken ct = default);
    Task<OpExternalWorkshopDto> AddWorkshopAsync(Guid manufacturingOrderId, SaveOpWorkshopCommand command, string userName, CancellationToken ct = default);
    Task DeleteWorkshopAsync(Guid manufacturingOrderId, Guid lineId, CancellationToken ct = default);

    Task SetProductionDeliveryDateAsync(Guid manufacturingOrderId, DateTime? date, string userName, CancellationToken ct = default);
    Task<OpCostSummaryDto> GetCostSummaryAsync(Guid manufacturingOrderId, CancellationToken ct = default);
}
