namespace Perlax.Modules.Production.Application.Manufacturing;

public record ManufacturingOrderListItemDto(
    Guid Id,
    string OpNumber,
    string OrderNumber,
    string OtNumber,
    string ClientName,
    string ProductName,
    string ReferenceName,
    string PurchaseOrderNumber,
    DateTime? AgreedDeliveryDate,
    decimal QuantityOrdered,
    decimal ReceiptPercentage,
    decimal QuantityToProduce,
    decimal ApprovedUnitPrice,
    DateTime? OpeningDate,
    string Status,
    string? OpenedBy = null);

public record ManufacturingOrderStatusBoardItemDto(
    Guid Id,
    string OpNumber,
    string OrderNumber,
    string OtNumber,
    string ClientName,
    string ProductName,
    string ReferenceName,
    DateTime? AgreedDeliveryDate,
    decimal QuantityToProduce,
    decimal QuantityProduced,
    decimal ProgressPercent,
    string DisplayStatus,
    string Status,
    DateTime? OpeningDate,
    string? OpenedBy,
    bool IsExistingOp = false);

public record OpenManufacturingOrderCommand(
    DateTime? OpeningDate,
    decimal? ReceiptPercentage,
    decimal? QuantityToProduce);

public record UpdateManufacturingOrderCommand(
    decimal? ReceiptPercentage,
    decimal? QuantityToProduce);

public record RegisterExistingOpCommand(
    string OpNumber,
    string? OtNumber,
    string ClientName,
    string ProductName,
    string? ReferenceName,
    string? PurchaseOrderNumber,
    decimal QuantityToProduce,
    decimal? QuantityOrdered,
    DateTime OpeningDate,
    DateTime? AgreedDeliveryDate,
    string? CodigoTroquel,
    string? MaterialNotes,
    string? FabricationProcessesJson,
    string? LineaPT,
    decimal? Alto,
    decimal? Ancho,
    decimal? Largo,
    string? Terminado1,
    string? Terminado2,
    bool TintaC = false,
    bool TintaM = false,
    bool TintaY = false,
    bool TintaK = false,
    string? EjecutivoCuenta = null,
    decimal? Fuelle = null,
    string? PieImprenta = null,
    string? AdjuntosJson = null,
    string? SustratoSup = null,
    string? LegacyImportJson = null,
    IReadOnlyList<ExistingOpParsedPartDto>? Parts = null);

/// <summary>Una pieza detectada en la OP expertiS (bloque Pieza: …).</summary>
public record ExistingOpParsedPartDto(
    string PartName,
    string? Material,
    string? FabricationProcessesJson,
    decimal? Alto = null,
    decimal? Ancho = null,
    decimal? Largo = null,
    decimal? Fuelle = null,
    decimal? AltoPliego = null,
    decimal? AnchoPliego = null,
    decimal? Hojas = null,
    string? CodigoTroquel = null,
    string? Notas = null);

/// <summary>Resultado de leer ficha técnica + OP (PDFs legacy / expertiS).</summary>
public record ExistingOpParsedDto(
    string OpNumber,
    string? OtNumber,
    string ClientName,
    string ProductName,
    string ReferenceName,
    string? PurchaseOrderNumber,
    string? EjecutivoCuenta,
    string LineaPT,
    decimal QuantityToProduce,
    decimal QuantityOrdered,
    DateTime OpeningDate,
    DateTime? AgreedDeliveryDate,
    string? CodigoTroquel,
    string? MaterialNotes,
    string? FabricationProcessesJson,
    decimal? Alto,
    decimal? Ancho,
    decimal? Largo,
    decimal? Fuelle,
    string? Terminado1,
    string? Terminado2,
    string? PieImprenta,
    bool TintaC,
    bool TintaM,
    bool TintaY,
    bool TintaK,
    IReadOnlyList<string> Warnings,
    string? RawFichaText = null,
    string? RawOpText = null,
    IReadOnlyList<ExistingOpParsedPartDto>? Parts = null);

public record ExistingOpPdfFileDto(string FileName, string? ContentType, long Length, Stream Content);

public record ExistingOpLegacyImportDto(
    Guid ManufacturingOrderId,
    string OpNumber,
    string? LegacyImportJson);

public interface IManufacturingOrderService
{
    Task<IReadOnlyList<ManufacturingOrderListItemDto>> GetPendingOpeningAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ManufacturingOrderStatusBoardItemDto>> GetStatusBoardAsync(string? status = null, string? q = null, CancellationToken ct = default);
    Task<IReadOnlyList<ManufacturingOrderListItemDto>> GetOpenedAsync(CancellationToken ct = default);
    Task<ManufacturingOrderListItemDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task OpenAsync(Guid id, OpenManufacturingOrderCommand command, string userName, CancellationToken ct = default);
    Task UpdatePendingAsync(Guid id, UpdateManufacturingOrderCommand command, string userName, CancellationToken ct = default);
    Task CloseAsync(Guid id, string userName, CancellationToken ct = default);
    Task<ManufacturingOrderListItemDto> RegisterExistingAsync(RegisterExistingOpCommand command, string userName, CancellationToken ct = default);
    Task<ExistingOpParsedDto> ParseExistingFromPdfsAsync(ExistingOpPdfFileDto fichaPdf, ExistingOpPdfFileDto opPdf, CancellationToken ct = default);
    Task<ManufacturingOrderListItemDto> RegisterExistingFromPdfsAsync(
        ExistingOpPdfFileDto fichaPdf,
        ExistingOpPdfFileDto opPdf,
        string uploadsRoot,
        string userName,
        string? overridesJson = null,
        CancellationToken ct = default);
    Task<ExistingOpLegacyImportDto?> GetLegacyImportAsync(Guid manufacturingOrderId, CancellationToken ct = default);
}
