namespace Perlax.Modules.Production.Application.OpDetail;

/// <summary>
/// Puerto hacia Almacén para crear requisiciones desde materiales de OP.
/// La implementación vive en el Host.
/// </summary>
public interface IAlmacenRequisitionBridge
{
    Task<AlmacenRequisitionCreatedDto> CreateAsync(
        AlmacenRequisitionCreateRequest request,
        string userName,
        Guid? userId,
        CancellationToken ct = default);
}

public record AlmacenRequisitionCreateRequest(
    string TipoRequisicionId,
    DateTime FechaSolicitud,
    string OrdenProduccionNumero,
    Guid? CatalogoOpId,
    string Cliente,
    string Referencia,
    Guid? ProductoId,
    string ProductoNombre,
    decimal Cantidad,
    string Unidad,
    DateTime FechaRequerida,
    string? Observacion);

public record AlmacenRequisitionCreatedDto(Guid Id, string Codigo);
