using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Almacen.Application.Abstractions;
using Perlax.Modules.Almacen.Application.DTOs;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Web.Services;

/// <summary>Expone OT/OP abiertas de Production al modulo Almacen sin acoplar DbContexts.</summary>
public sealed class ProductionOrderLookup : IProductionOrderLookup
{
    private readonly ProductionDbContext _db;

    public ProductionOrderLookup(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<OrdenProduccionLookupDto>> SearchAsync(string? q, int limit, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit <= 0 ? 30 : limit, 1, 100);
        var term = string.IsNullOrWhiteSpace(q) ? null : q.Trim().ToLowerInvariant();

        var otQuery = _db.ProductionOrders.AsNoTracking();
        if (term != null)
        {
            otQuery = otQuery.Where(o =>
                o.OTNumber.ToLower().Contains(term) ||
                o.Cliente.ToLower().Contains(term) ||
                o.ProductName.ToLower().Contains(term));
        }

        var opQuery = _db.ManufacturingOrders.AsNoTracking()
            .Where(m => m.OpeningDate != null && m.Status == "Abierta");
        if (term != null)
        {
            opQuery = opQuery.Where(m =>
                m.OpNumber.ToLower().Contains(term) ||
                m.ClientName.ToLower().Contains(term) ||
                m.ProductName.ToLower().Contains(term) ||
                m.OrderNumber.ToLower().Contains(term));
        }

        var otResults = await otQuery
            .OrderByDescending(o => o.CreatedAt)
            .Take(limit)
            .Select(o => new OrdenProduccionLookupDto(o.Id, o.OTNumber, o.Cliente, o.ProductName))
            .ToListAsync(ct);

        var opResults = await opQuery
            .OrderByDescending(m => m.OpeningDate)
            .Take(limit)
            .Select(m => new OrdenProduccionLookupDto(m.Id, m.OpNumber, m.ClientName, m.ProductName))
            .ToListAsync(ct);

        return otResults
            .Concat(opResults)
            .Take(limit)
            .ToList();
    }
}