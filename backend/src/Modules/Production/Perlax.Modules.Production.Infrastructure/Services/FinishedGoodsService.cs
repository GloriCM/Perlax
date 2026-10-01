using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.InventarioPt;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class FinishedGoodsService : IFinishedGoodsService
{
    private readonly ProductionDbContext _db;

    public FinishedGoodsService(ProductionDbContext db) => _db = db;

    /// <summary>CREATE IF NOT EXISTS — idempotente; no cachear en memoria (evita saltar el DDL tras fallos).</summary>
    private Task EnsureReturnsTableAsync(CancellationToken ct) =>
        CommercialChainSchemaFixes.EnsureFinishedGoodsReturnsAsync(_db, ct);

    public async Task<IReadOnlyList<FinishedGoodsBalanceDto>> ListBalancesAsync(bool onlyWithStock = true, CancellationToken ct = default)
    {
        await EnsureReturnsTableAsync(ct);
        var ops = await _db.ManufacturingOrders.AsNoTracking()
            .Where(m => m.OpeningDate != null)
            .OrderByDescending(m => m.OpeningDate)
            .ToListAsync(ct);

        var entries = await _db.FinishedGoodsEntries.AsNoTracking()
            .GroupBy(e => e.ManufacturingOrderId)
            .Select(g => new { MoId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.MoId, x => x.Qty, ct);

        var remisioned = await _db.RemisionItems.AsNoTracking()
            .Include(i => i.Remision)
            .Where(i => i.ManufacturingOrderId != null
                        && i.Remision != null
                        && i.Remision.Status != RemisionStatuses.Cancelled)
            .GroupBy(i => i.ManufacturingOrderId!.Value)
            .Select(g => new { MoId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.MoId, x => x.Qty, ct);

        var returned = await _db.FinishedGoodsReturns.AsNoTracking()
            .GroupBy(r => r.ManufacturingOrderId)
            .Select(g => new { MoId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.MoId, x => x.Qty, ct);

        var result = new List<FinishedGoodsBalanceDto>();
        foreach (var mo in ops)
        {
            entries.TryGetValue(mo.Id, out var produced);
            if (produced <= 0 && (mo.Status is "Abierta" or "Cerrada"))
                produced = mo.QuantityToProduce;

            remisioned.TryGetValue(mo.Id, out var remQty);
            returned.TryGetValue(mo.Id, out var retQty);
            var available = produced - remQty + retQty;
            if (onlyWithStock && available <= 0) continue;

            result.Add(new FinishedGoodsBalanceDto(
                mo.Id,
                mo.OpNumber,
                mo.OrderNumber,
                mo.ClientName,
                mo.ProductName,
                mo.ReferenceName,
                mo.QuantityToProduce,
                produced,
                remQty,
                retQty,
                available,
                mo.Status));
        }

        return result;
    }

    public async Task<IReadOnlyList<FinishedGoodsEntryDto>> ListEntriesAsync(Guid manufacturingOrderId, CancellationToken ct = default)
    {
        return await _db.FinishedGoodsEntries.AsNoTracking()
            .Where(e => e.ManufacturingOrderId == manufacturingOrderId)
            .OrderByDescending(e => e.EntryDate)
            .Select(e => new FinishedGoodsEntryDto(e.Id, e.ManufacturingOrderId, e.EntryDate, e.Quantity, e.Notes, e.CreatedBy))
            .ToListAsync(ct);
    }

    public async Task<FinishedGoodsEntryDto> AddEntryAsync(AddFinishedGoodsEntryCommand command, string userName, CancellationToken ct = default)
    {
        if (command.Quantity <= 0)
            throw new InvalidOperationException("La cantidad debe ser mayor a cero.");

        var mo = await _db.ManufacturingOrders.FirstOrDefaultAsync(m => m.Id == command.ManufacturingOrderId, ct)
            ?? throw new KeyNotFoundException("Orden de producción no encontrada.");

        if (mo.OpeningDate == null)
            throw new InvalidOperationException("Solo se registra PT en OP abiertas.");

        var entry = new FinishedGoodsEntry
        {
            Id = Guid.NewGuid(),
            ManufacturingOrderId = mo.Id,
            EntryDate = ToUtc(command.EntryDate),
            Quantity = command.Quantity,
            Notes = command.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };

        _db.FinishedGoodsEntries.Add(entry);
        await _db.SaveChangesAsync(ct);

        return new FinishedGoodsEntryDto(entry.Id, entry.ManufacturingOrderId, entry.EntryDate, entry.Quantity, entry.Notes, entry.CreatedBy);
    }

    public async Task<string> GetNextReturnNumberAsync(CancellationToken ct = default)
    {
        await EnsureReturnsTableAsync(ct);
        var year = DateTime.UtcNow.Year;
        var prefix = $"DV-{year}-";
        var last = await _db.FinishedGoodsReturns
            .Where(x => x.ReturnNumber.StartsWith(prefix))
            .OrderByDescending(x => x.ReturnNumber)
            .Select(x => x.ReturnNumber)
            .FirstOrDefaultAsync(ct);

        var next = 1;
        if (!string.IsNullOrEmpty(last) && int.TryParse(last.AsSpan(prefix.Length), out var n))
            next = n + 1;
        return $"{prefix}{next:D5}";
    }

    public async Task<IReadOnlyList<FinishedGoodsReturnDto>> ListReturnsAsync(CancellationToken ct = default)
    {
        await EnsureReturnsTableAsync(ct);
        try
        {
            return await _db.FinishedGoodsReturns.AsNoTracking()
                .OrderByDescending(x => x.ReturnDate)
                .ThenByDescending(x => x.ReturnNumber)
                .Select(x => new FinishedGoodsReturnDto(
                    x.Id, x.ReturnNumber, x.ManufacturingOrderId, x.RemisionId, x.RemisionItemId,
                    x.OpNumber, x.ClientName, x.ProductName, x.ReferenceName,
                    x.Quantity, x.ReturnDate, x.Reason, x.Notes, x.CreatedBy))
                .ToListAsync(ct);
        }
        catch (Exception ex) when (ex.GetType().Name.Contains("Postgres", StringComparison.Ordinal)
                                   || ex.InnerException?.GetType().Name.Contains("Postgres", StringComparison.Ordinal) == true
                                   || (ex.Message?.Contains("FinishedGoodsReturns", StringComparison.Ordinal) ?? false))
        {
            // Self-heal: recreate table and retry once (covers aborted tx / stale process).
            await CommercialChainSchemaFixes.EnsureFinishedGoodsReturnsAsync(_db, ct);
            return await _db.FinishedGoodsReturns.AsNoTracking()
                .OrderByDescending(x => x.ReturnDate)
                .ThenByDescending(x => x.ReturnNumber)
                .Select(x => new FinishedGoodsReturnDto(
                    x.Id, x.ReturnNumber, x.ManufacturingOrderId, x.RemisionId, x.RemisionItemId,
                    x.OpNumber, x.ClientName, x.ProductName, x.ReferenceName,
                    x.Quantity, x.ReturnDate, x.Reason, x.Notes, x.CreatedBy))
                .ToListAsync(ct);
        }
    }

    public async Task<IReadOnlyList<ReturnableDispatchDto>> ListReturnableAsync(CancellationToken ct = default)
    {
        await EnsureReturnsTableAsync(ct);
        var items = await _db.RemisionItems.AsNoTracking()
            .Include(i => i.Remision)
            .Where(i => i.ManufacturingOrderId != null
                        && i.Remision != null
                        && i.Remision.Status != RemisionStatuses.Cancelled
                        && i.Quantity > 0)
            .OrderByDescending(i => i.Remision!.RemisionDate)
            .ToListAsync(ct);

        var returnsByItem = await _db.FinishedGoodsReturns.AsNoTracking()
            .Where(r => r.RemisionItemId != null)
            .GroupBy(r => r.RemisionItemId!.Value)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        var result = new List<ReturnableDispatchDto>();
        foreach (var item in items)
        {
            var moId = item.ManufacturingOrderId!.Value;
            returnsByItem.TryGetValue(item.Id, out var already);
            var returnable = item.Quantity - already;
            if (returnable <= 0) continue;

            result.Add(new ReturnableDispatchDto(
                moId,
                item.RemisionId,
                item.Id,
                item.Remision!.RemisionNumber,
                "",
                item.Remision.ClientName,
                item.ProductName,
                item.ReferenceName,
                item.Quantity,
                already,
                returnable));
        }

        // Enrich OP number from manufacturing orders
        var moIds = result.Select(r => r.ManufacturingOrderId).Distinct().ToList();
        var mos = await _db.ManufacturingOrders.AsNoTracking()
            .Where(m => moIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.OpNumber, ct);

        return result.Select(r =>
        {
            mos.TryGetValue(r.ManufacturingOrderId, out var op);
            return r with { OpNumber = op ?? r.OpNumber };
        }).ToList();
    }

    public async Task<FinishedGoodsReturnDto> AddReturnAsync(AddFinishedGoodsReturnCommand command, string userName, CancellationToken ct = default)
    {
        await EnsureReturnsTableAsync(ct);
        if (command.Quantity <= 0)
            throw new InvalidOperationException("La cantidad debe ser mayor a cero.");

        var mo = await _db.ManufacturingOrders.FirstOrDefaultAsync(m => m.Id == command.ManufacturingOrderId, ct)
            ?? throw new KeyNotFoundException("Orden de producción no encontrada.");

        decimal remisioned;
        decimal alreadyReturned;
        Guid? remisionId = command.RemisionId;
        Guid? remisionItemId = command.RemisionItemId;
        string productName = mo.ProductName;
        string referenceName = mo.ReferenceName;

        if (command.RemisionItemId.HasValue)
        {
            var item = await _db.RemisionItems.Include(i => i.Remision)
                .FirstOrDefaultAsync(i => i.Id == command.RemisionItemId.Value, ct)
                ?? throw new KeyNotFoundException("Ítem de remisión no encontrado.");

            if (item.Remision == null || item.Remision.Status == RemisionStatuses.Cancelled)
                throw new InvalidOperationException("La remisión no está vigente.");
            if (item.ManufacturingOrderId != mo.Id)
                throw new InvalidOperationException("El ítem de remisión no pertenece a esa OP.");

            remisionId = item.RemisionId;
            remisionItemId = item.Id;
            productName = item.ProductName;
            referenceName = item.ReferenceName;
            remisioned = item.Quantity;
            alreadyReturned = await _db.FinishedGoodsReturns.AsNoTracking()
                .Where(r => r.RemisionItemId == item.Id)
                .SumAsync(r => (decimal?)r.Quantity, ct) ?? 0;
        }
        else
        {
            remisioned = await _db.RemisionItems.AsNoTracking()
                .Include(i => i.Remision)
                .Where(i => i.ManufacturingOrderId == mo.Id
                            && i.Remision != null
                            && i.Remision.Status != RemisionStatuses.Cancelled)
                .SumAsync(i => (decimal?)i.Quantity, ct) ?? 0;
            alreadyReturned = await _db.FinishedGoodsReturns.AsNoTracking()
                .Where(r => r.ManufacturingOrderId == mo.Id)
                .SumAsync(r => (decimal?)r.Quantity, ct) ?? 0;
        }

        var returnable = remisioned - alreadyReturned;
        if (command.Quantity > returnable + 0.0001m)
            throw new InvalidOperationException(
                $"La cantidad excede lo devoluble (máximo {returnable:0.##}).");

        var row = new FinishedGoodsReturn
        {
            Id = Guid.NewGuid(),
            ReturnNumber = await GetNextReturnNumberAsync(ct),
            ManufacturingOrderId = mo.Id,
            RemisionId = remisionId,
            RemisionItemId = remisionItemId,
            OpNumber = mo.OpNumber,
            ClientName = mo.ClientName,
            ProductName = productName,
            ReferenceName = referenceName,
            Quantity = command.Quantity,
            ReturnDate = ToUtc(command.ReturnDate),
            Reason = string.IsNullOrWhiteSpace(command.Reason) ? null : command.Reason.Trim(),
            Notes = command.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };

        _db.FinishedGoodsReturns.Add(row);
        await _db.SaveChangesAsync(ct);

        return new FinishedGoodsReturnDto(
            row.Id, row.ReturnNumber, row.ManufacturingOrderId, row.RemisionId, row.RemisionItemId,
            row.OpNumber, row.ClientName, row.ProductName, row.ReferenceName,
            row.Quantity, row.ReturnDate, row.Reason, row.Notes, row.CreatedBy);
    }

    private static DateTime ToUtc(DateTime value) =>
        value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
}
