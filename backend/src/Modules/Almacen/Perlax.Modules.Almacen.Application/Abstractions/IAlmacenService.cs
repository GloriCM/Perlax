using Microsoft.AspNetCore.Http;
using Perlax.Modules.Almacen.Application.DTOs;

namespace Perlax.Modules.Almacen.Application.Abstractions;

public interface IAlmacenService
{
    Task<CatalogosResponse> GetCatalogosAsync(CancellationToken ct = default);

    Task<IReadOnlyList<ProductoDto>> ListProductosAsync(string? tipo, string? q, string? unidad, CancellationToken ct = default);
    Task<ProductoDto> CreateProductoAsync(ProductoUpsertRequest request, CancellationToken ct = default);
    Task<ProductoDto> UpdateProductoAsync(Guid id, ProductoUpsertRequest request, CancellationToken ct = default);
    Task DeleteProductoAsync(Guid id, CancellationToken ct = default);
    Task<ImportResultDto> ImportProductosExcelAsync(IFormFile file, CancellationToken ct = default);

    Task<IReadOnlyList<ProveedorDto>> ListProveedoresAsync(string? q, int limit, CancellationToken ct = default);
    Task<ProveedorDto> CreateProveedorAsync(ProveedorUpsertRequest request, CancellationToken ct = default);
    Task<ProveedorDto> UpdateProveedorAsync(Guid id, ProveedorUpsertRequest request, CancellationToken ct = default);
    Task DeleteProveedorAsync(Guid id, CancellationToken ct = default);
    Task DeleteAllProveedoresAsync(CancellationToken ct = default);
    Task<ImportResultDto> ImportProveedoresExcelAsync(IFormFile file, CancellationToken ct = default);

    Task<IReadOnlyList<OrdenProduccionLookupDto>> SearchOrdenesProduccionAsync(string? q, int limit, CancellationToken ct = default);

    Task<IReadOnlyList<RequisicionListDto>> ListRequisicionesAsync(string? tipo, string? estado, string? q, CancellationToken ct = default);
    Task<RequisicionDetailDto> GetRequisicionAsync(Guid id, CancellationToken ct = default);
    Task<RequisicionDetailDto> CreateRequisicionAsync(RequisicionUpsertRequest request, AlmacenUserContext user, CancellationToken ct = default);
    Task<RequisicionDetailDto> UpdateRequisicionAsync(Guid id, RequisicionUpsertRequest request, CancellationToken ct = default);
    Task DeleteRequisicionAsync(Guid id, CancellationToken ct = default);
    Task<RequisicionDetailDto> GuardarPedidoAsync(Guid requisicionId, GuardarPedidoRequest request, AlmacenUserContext user, CancellationToken ct = default);
    Task PatchPagadoProveedorAsync(Guid requisicionId, Guid proveedorId, PagadoProveedorRequest request, CancellationToken ct = default);
    Task<RequisicionDetailDto> RegistrarRecepcionAsync(Guid requisicionId, RecepcionCreateRequest request, AlmacenUserContext user, CancellationToken ct = default);
    Task DeletePedidoAsync(Guid requisicionId, CancellationToken ct = default);

    Task<IReadOnlyList<OrdenCompraListDto>> ListOrdenesCompraAsync(string? estado, Guid? proveedorCatalogoId, string? nombreProveedor, string? nit, CancellationToken ct = default);
    Task<OrdenCompraDetailDto> GetOrdenCompraAsync(Guid id, CancellationToken ct = default);
    Task<OrdenCompraDetailDto> ConsolidarOrdenCompraAsync(ConsolidarOrdenCompraRequest request, AlmacenUserContext user, CancellationToken ct = default);
    Task<int> RepararAsignacionesAsync(CancellationToken ct = default);

    Task ResetPruebasAsync(CancellationToken ct = default);
}
