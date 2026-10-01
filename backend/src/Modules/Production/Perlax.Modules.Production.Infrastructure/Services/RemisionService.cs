using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Remisiones;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class RemisionService : IRemisionService
{
    private readonly ProductionDbContext _db;

    public RemisionService(ProductionDbContext db) => _db = db;

    public async Task<string> GetNextNumberAsync(CancellationToken ct = default)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"RM-{year}-";
        var last = await _db.Remisiones
            .Where(x => x.RemisionNumber.StartsWith(prefix))
            .OrderByDescending(x => x.RemisionNumber)
            .Select(x => x.RemisionNumber)
            .FirstOrDefaultAsync(ct);

        var next = 1;
        if (!string.IsNullOrEmpty(last) && int.TryParse(last.AsSpan(prefix.Length), out var n))
            next = n + 1;
        return $"{prefix}{next:D5}";
    }

    public async Task<IReadOnlyList<RemisionListItemDto>> ListAsync(CancellationToken ct = default)
    {
        var rows = await _db.Remisiones
            .AsNoTracking()
            .Include(x => x.Items)
            .OrderByDescending(x => x.RemisionDate)
            .ThenByDescending(x => x.RemisionNumber)
            .ToListAsync(ct);

        return rows.Select(x => new RemisionListItemDto(
            x.Id,
            x.RemisionNumber,
            x.CustomerOrderNumber,
            x.ClientName,
            x.RemisionDate,
            x.Status,
            x.Items.Sum(i => i.Quantity),
            x.HasTransport,
            x.TransportCost,
            x.InvoiceId,
            x.InvoiceId != null)).ToList();
    }

    public async Task<RemisionDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var rem = await _db.Remisiones.AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Remisión no encontrada.");

        var remisioned = await GetRemisionedByItemAsync(rem.CustomerOrderId, excludeRemisionId: rem.Id, ct);
        var orderItems = await _db.CustomerOrderItems.AsNoTracking()
            .Where(i => i.CustomerOrderId == rem.CustomerOrderId)
            .ToDictionaryAsync(i => i.Id, ct);

        return MapDetail(rem, remisioned, orderItems);
    }

    public async Task<IReadOnlyList<DispatchableOrderDto>> GetDispatchableOrdersAsync(string? clientName = null, CancellationToken ct = default)
    {
        await CommercialChainSchemaFixes.EnsureFinishedGoodsReturnsAsync(_db, ct);
        var query = _db.CustomerOrders.AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.IsApproved);

        if (!string.IsNullOrWhiteSpace(clientName))
        {
            var c = clientName.Trim().ToLower();
            query = query.Where(o => o.ClientName.ToLower() == c);
        }

        var orders = await query.OrderByDescending(o => o.OrderDate).ToListAsync(ct);
        var orderIds = orders.Select(o => o.Id).ToList();
        var remisionItems = await _db.RemisionItems.AsNoTracking()
            .Include(i => i.Remision)
            .Where(i => i.Remision != null
                        && orderIds.Contains(i.Remision.CustomerOrderId)
                        && i.Remision.Status != RemisionStatuses.Cancelled)
            .Select(i => new { i.Id, i.CustomerOrderItemId, i.Quantity })
            .ToListAsync(ct);
        var remisionItemIds = remisionItems.Select(i => i.Id).ToList();
        var returns = await _db.FinishedGoodsReturns.AsNoTracking()
            .Where(r => r.RemisionItemId != null && remisionItemIds.Contains(r.RemisionItemId.Value))
            .GroupBy(r => r.RemisionItemId!.Value)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);
        var remisioned = remisionItems
            .GroupBy(i => i.CustomerOrderItemId)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(i =>
                {
                    returns.TryGetValue(i.Id, out var ret);
                    return i.Quantity - ret;
                }));

        var mos = await _db.ManufacturingOrders.AsNoTracking()
            .Where(m => orderIds.Contains(m.CustomerOrderId))
            .ToListAsync(ct);

        var result = new List<DispatchableOrderDto>();
        foreach (var order in orders)
        {
            var items = new List<DispatchableItemDto>();
            foreach (var item in order.Items)
            {
                remisioned.TryGetValue(item.Id, out var already);
                var remaining = item.Quantity - already;
                if (remaining <= 0) continue;
                var mo = mos.FirstOrDefault(m => m.OrderPartId == item.OrderPartId && m.CustomerOrderId == order.Id);
                items.Add(new DispatchableItemDto(
                    item.Id,
                    item.OrderPartId,
                    item.ProductionOrderId,
                    mo?.Id,
                    item.ProductName,
                    item.ReferenceName,
                    item.Quantity,
                    already,
                    remaining,
                    item.ApprovedUnitPrice));
            }

            if (items.Count == 0) continue;
            result.Add(new DispatchableOrderDto(
                order.Id,
                order.OrderNumber,
                order.ClientName,
                order.AgreedDeliveryDate,
                items));
        }

        return result;
    }

    public async Task<RemisionDetailDto> CreateAsync(SaveRemisionCommand command, string userName, CancellationToken ct = default)
    {
        var order = await _db.CustomerOrders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == command.CustomerOrderId, ct)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");

        if (!order.IsApproved)
            throw new InvalidOperationException("Solo se pueden remisionar pedidos aprobados.");

        ValidateItems(command, order);
        await EnsureRemainingCapacityAsync(order, command.Items, excludeRemisionId: null, ct);

        var rem = new Remision
        {
            Id = Guid.NewGuid(),
            RemisionNumber = await GetNextNumberAsync(ct),
            CustomerOrderId = order.Id,
            CustomerOrderNumber = order.OrderNumber,
            ClientName = order.ClientName,
            RemisionDate = ToUtc(command.RemisionDate),
            Status = RemisionStatuses.Confirmed,
            Notes = command.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };

        var mos = await _db.ManufacturingOrders
            .Where(m => m.CustomerOrderId == order.Id)
            .ToListAsync(ct);

        foreach (var line in command.Items)
        {
            var orderItem = order.Items.First(i => i.Id == line.CustomerOrderItemId);
            var mo = mos.FirstOrDefault(m => m.OrderPartId == orderItem.OrderPartId);
            rem.Items.Add(new RemisionItem
            {
                Id = Guid.NewGuid(),
                RemisionId = rem.Id,
                CustomerOrderItemId = orderItem.Id,
                ManufacturingOrderId = mo?.Id,
                OrderPartId = orderItem.OrderPartId,
                ProductionOrderId = orderItem.ProductionOrderId,
                ProductName = orderItem.ProductName,
                ReferenceName = orderItem.ReferenceName,
                Quantity = line.Quantity,
                UnitPrice = orderItem.ApprovedUnitPrice,
                DispatchNotes = line.DispatchNotes,
                IsFinalDispatch = line.IsFinalDispatch,
                FinalDispatchCode = line.IsFinalDispatch ? Guid.NewGuid().ToString("N")[..8].ToUpperInvariant() : null
            });

            if (line.IsFinalDispatch && mo != null && !string.Equals(mo.Status, "Cerrada", StringComparison.OrdinalIgnoreCase))
            {
                mo.Status = "Cerrada";
                mo.ClosedAt = DateTime.UtcNow;
                mo.ClosedBy = userName;
                mo.UpdatedAt = DateTime.UtcNow;
                mo.UpdatedBy = userName;
            }
        }

        _db.Remisiones.Add(rem);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(rem.Id, ct);
    }

    public async Task UpdateAsync(Guid id, SaveRemisionCommand command, string userName, CancellationToken ct = default)
    {
        var rem = await _db.Remisiones.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Remisión no encontrada.");

        if (rem.InvoiceId != null)
            throw new InvalidOperationException("No se puede editar una remisión ya facturada.");
        if (rem.Status == RemisionStatuses.Cancelled)
            throw new InvalidOperationException("La remisión está anulada.");

        var order = await _db.CustomerOrders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == command.CustomerOrderId, ct)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");

        ValidateItems(command, order);
        await EnsureRemainingCapacityAsync(order, command.Items, excludeRemisionId: id, ct);

        rem.RemisionDate = ToUtc(command.RemisionDate);
        rem.Notes = command.Notes;
        rem.UpdatedAt = DateTime.UtcNow;
        rem.UpdatedBy = userName;

        _db.RemisionItems.RemoveRange(rem.Items);
        rem.Items.Clear();

        var mos = await _db.ManufacturingOrders.Where(m => m.CustomerOrderId == order.Id).ToListAsync(ct);
        foreach (var line in command.Items)
        {
            var orderItem = order.Items.First(i => i.Id == line.CustomerOrderItemId);
            var mo = mos.FirstOrDefault(m => m.OrderPartId == orderItem.OrderPartId);
            rem.Items.Add(new RemisionItem
            {
                Id = Guid.NewGuid(),
                RemisionId = rem.Id,
                CustomerOrderItemId = orderItem.Id,
                ManufacturingOrderId = mo?.Id,
                OrderPartId = orderItem.OrderPartId,
                ProductionOrderId = orderItem.ProductionOrderId,
                ProductName = orderItem.ProductName,
                ReferenceName = orderItem.ReferenceName,
                Quantity = line.Quantity,
                UnitPrice = orderItem.ApprovedUnitPrice,
                DispatchNotes = line.DispatchNotes,
                IsFinalDispatch = line.IsFinalDispatch,
                FinalDispatchCode = line.IsFinalDispatch ? Guid.NewGuid().ToString("N")[..8].ToUpperInvariant() : null
            });

            if (line.IsFinalDispatch && mo != null && !string.Equals(mo.Status, "Cerrada", StringComparison.OrdinalIgnoreCase))
            {
                mo.Status = "Cerrada";
                mo.ClosedAt = DateTime.UtcNow;
                mo.ClosedBy = userName;
                mo.UpdatedAt = DateTime.UtcNow;
                mo.UpdatedBy = userName;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task AssignTransportAsync(Guid id, AssignTransportCommand command, string userName, CancellationToken ct = default)
    {
        var rem = await _db.Remisiones.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Remisión no encontrada.");

        if (string.IsNullOrWhiteSpace(command.Carrier))
            throw new InvalidOperationException("El transportador es obligatorio.");
        if (command.Cost < 0)
            throw new InvalidOperationException("El costo de transporte no puede ser negativo.");

        rem.HasTransport = true;
        rem.TransportCarrier = command.Carrier.Trim();
        rem.TransportPlate = command.Plate?.Trim();
        rem.TransportDriver = command.Driver?.Trim();
        rem.TransportCost = command.Cost;
        rem.TransportNotes = command.Notes;
        rem.UpdatedAt = DateTime.UtcNow;
        rem.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, string userName, CancellationToken ct = default)
    {
        var rem = await _db.Remisiones.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Remisión no encontrada.");

        if (rem.InvoiceId != null)
            throw new InvalidOperationException("No se puede eliminar una remisión facturada. Anule la factura primero.");

        rem.Status = RemisionStatuses.Cancelled;
        rem.UpdatedAt = DateTime.UtcNow;
        rem.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
    }

    private static void ValidateItems(SaveRemisionCommand command, CustomerOrder order)
    {
        if (command.Items == null || command.Items.Count == 0)
            throw new InvalidOperationException("Debe incluir al menos un ítem a remisionar.");

        foreach (var line in command.Items)
        {
            if (line.Quantity <= 0)
                throw new InvalidOperationException("La cantidad remisionada debe ser mayor a cero.");
            if (order.Items.All(i => i.Id != line.CustomerOrderItemId))
                throw new InvalidOperationException("Hay ítems que no pertenecen al pedido seleccionado.");
        }
    }

    private async Task EnsureRemainingCapacityAsync(
        CustomerOrder order,
        IReadOnlyList<RemisionItemCommand> items,
        Guid? excludeRemisionId,
        CancellationToken ct)
    {
        var remisioned = await GetRemisionedByItemAsync(order.Id, excludeRemisionId, ct);
        foreach (var line in items)
        {
            var orderItem = order.Items.First(i => i.Id == line.CustomerOrderItemId);
            remisioned.TryGetValue(line.CustomerOrderItemId, out var already);
            var remaining = orderItem.Quantity - already;
            if (line.Quantity > remaining + 0.0001m)
                throw new InvalidOperationException(
                    $"Cantidad excede el saldo pendiente de {orderItem.ProductName} (disponible {remaining:0.##}).");
        }
    }

    private async Task<Dictionary<Guid, decimal>> GetRemisionedByItemAsync(Guid customerOrderId, Guid? excludeRemisionId, CancellationToken ct)
    {
        await CommercialChainSchemaFixes.EnsureFinishedGoodsReturnsAsync(_db, ct);
        var q = _db.RemisionItems.AsNoTracking()
            .Include(i => i.Remision)
            .Where(i => i.Remision != null
                        && i.Remision.CustomerOrderId == customerOrderId
                        && i.Remision.Status != RemisionStatuses.Cancelled);

        if (excludeRemisionId.HasValue)
            q = q.Where(i => i.RemisionId != excludeRemisionId.Value);

        var items = await q.Select(i => new { i.Id, i.CustomerOrderItemId, i.Quantity }).ToListAsync(ct);
        var itemIds = items.Select(i => i.Id).ToList();
        var returns = await _db.FinishedGoodsReturns.AsNoTracking()
            .Where(r => r.RemisionItemId != null && itemIds.Contains(r.RemisionItemId.Value))
            .GroupBy(r => r.RemisionItemId!.Value)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        return items
            .GroupBy(i => i.CustomerOrderItemId)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(i =>
                {
                    returns.TryGetValue(i.Id, out var ret);
                    return i.Quantity - ret;
                }));
    }

    private static RemisionDetailDto MapDetail(
        Remision rem,
        Dictionary<Guid, decimal> remisioned,
        Dictionary<Guid, CustomerOrderItem> orderItems)
    {
        return new RemisionDetailDto(
            rem.Id,
            rem.RemisionNumber,
            rem.CustomerOrderId,
            rem.CustomerOrderNumber,
            rem.ClientName,
            rem.RemisionDate,
            rem.Status,
            rem.Notes,
            rem.HasTransport,
            rem.TransportCarrier,
            rem.TransportPlate,
            rem.TransportDriver,
            rem.TransportCost,
            rem.TransportNotes,
            rem.InvoiceId,
            rem.Items.Select(i =>
            {
                orderItems.TryGetValue(i.CustomerOrderItemId, out var oi);
                remisioned.TryGetValue(i.CustomerOrderItemId, out var already);
                var ordered = oi?.Quantity ?? i.Quantity;
                return new RemisionItemDto(
                    i.Id,
                    i.CustomerOrderItemId,
                    i.ManufacturingOrderId,
                    i.OrderPartId,
                    i.ProductName,
                    i.ReferenceName,
                    i.Quantity,
                    i.UnitPrice,
                    i.DispatchNotes,
                    i.IsFinalDispatch,
                    i.FinalDispatchCode,
                    Math.Max(0, ordered - already - i.Quantity));
            }).ToList());
    }

    private static DateTime ToUtc(DateTime value) =>
        value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
}
