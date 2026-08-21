namespace Perlax.Modules.Production.Application.TechnicalSheets;

public record TechnicalSheetListItemDto(
    Guid Id,
    Guid ProductionOrderId,
    Guid OrderId,
    string? OtNumber,
    string Pieza,
    string? Cliente,
    string? ProductName,
    string? CodigoTroquel,
    string? ProductCode,
    bool Approved,
    DateTime? ApprovedAt,
    string? ApprovedBy,
    string? RejectionReason);

public record TechnicalSheetDetailDto(
    Guid Id,
    Guid OrderId,
    string? OtNumber,
    string? Cliente,
    string? Ejecutivo,
    string? Linea,
    string? Producto,
    string Pieza,
    string? CodigoSap,
    DateTime? FechaSolicitud,
    string? Asignacion,
    string? Cabida,
    decimal AltoPliego,
    decimal AnchoPliego,
    IReadOnlyList<string> AmpliacionesUrls,
    IReadOnlyList<string> AdjuntosUrls,
    string? SustratoSup,
    string? SustratoMed,
    string? SustratoInf,
    string? DireccionFibra,
    string? TipoFlauta,
    string? DireccionFlauta,
    decimal Alto,
    decimal Largo,
    decimal Ancho,
    decimal Fuelle,
    bool TroquelNuevo,
    string? CodigoTroq,
    bool TintaC,
    bool TintaM,
    bool TintaY,
    bool TintaK,
    string? TintasEspeciales,
    string? Terminado1,
    string? Terminado2,
    bool Estampado,
    string? PieImprenta,
    string? TipoManija,
    string? MRef,
    decimal MLargo,
    string? Notas,
    bool Approved,
    DateTime? ApprovedAt,
    string? ApprovedBy,
    DateTime FechaCreacion,
    DateTime? FechaActualizacion);

public record TechnicalSheetApprovalResultDto(
    Guid Id,
    bool Approved,
    DateTime? ApprovedAt,
    string? ApprovedBy,
    string? RejectionReason,
    string OtNumber,
    string PartName);

public interface ITechnicalSheetService
{
    Task<IReadOnlyList<TechnicalSheetListItemDto>> ListAsync(string? q = null, CancellationToken ct = default);
    Task<TechnicalSheetDetailDto> GetByPartIdAsync(Guid partId, CancellationToken ct = default);
    Task<TechnicalSheetApprovalResultDto> SetApprovalAsync(Guid partId, bool approved, string? rejectionReason, string userName, CancellationToken ct = default);
}