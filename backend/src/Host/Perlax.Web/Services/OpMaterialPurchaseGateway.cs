using Perlax.Modules.Almacen.Application.Abstractions;
using Perlax.Modules.Almacen.Application.DTOs;
using Perlax.Modules.Production.Application.OpDetail;

namespace Perlax.Web.Services;

/// <summary>Crea la requisición de Compras cuando a la OP le falta material.</summary>
public sealed class OpMaterialPurchaseGateway : IOpMaterialPurchaseGateway
{
    private readonly IAlmacenService _almacen;

    public OpMaterialPurchaseGateway(IAlmacenService almacen) => _almacen = almacen;

    public async Task<OpMaterialPurchaseResult> CreateAsync(OpMaterialPurchaseRequest request, string userName, CancellationToken ct = default)
    {
        var created = await _almacen.CreateRequisicionAsync(
            new RequisicionUpsertRequest(
                request.TipoRequisicionId,
                DateTime.UtcNow,
                request.OrdenProduccionNumero,
                request.CatalogoOpId,
                request.Cliente,
                request.Referencia,
                request.ProductoId,
                request.ProductoNombre,
                request.Cantidad,
                request.Unidad,
                request.FechaRequerida,
                request.Observacion),
            new AlmacenUserContext(null, string.IsNullOrWhiteSpace(userName) ? "system" : userName),
            ct);

        return new OpMaterialPurchaseResult(created.Id, created.Codigo);
    }
}
