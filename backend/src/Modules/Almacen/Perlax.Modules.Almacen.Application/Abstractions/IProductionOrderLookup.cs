using Perlax.Modules.Almacen.Application.DTOs;

namespace Perlax.Modules.Almacen.Application.Abstractions;

/// <summary>
/// Puerto hacia ordenes de produccion / OT del modulo Production.
/// La implementacion vive en el Host (no en Almacen.Infrastructure).
/// </summary>
public interface IProductionOrderLookup
{
    Task<IReadOnlyList<OrdenProduccionLookupDto>> SearchAsync(string? q, int limit, CancellationToken ct = default);
}