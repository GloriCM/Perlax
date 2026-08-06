using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Manufacturing;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public class ManufacturingOrderSyncService : IManufacturingOrderSyncService
{
    private readonly ProductionDbContext _context;

    public ManufacturingOrderSyncService(ProductionDbContext context)
    {
        _context = context;
    }

    public async Task EnsureApprovedOrdersSyncedAsync(CancellationToken ct = default)
    {
        var orderIds = await _context.CustomerOrders
            .AsNoTracking()
            .Where(o => o.IsApproved)
            .Select(o => o.Id)
            .ToListAsync(ct);

        foreach (var orderId in orderIds)
        {
            await SyncForCustomerOrderAsync(orderId, null, ct);
        }
    }

    public async Task SyncForCustomerOrderAsync(Guid customerOrderId, string? userName = null, CancellationToken ct = default)
    {
        var order = await _context.CustomerOrders
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == customerOrderId, ct);

        if (order == null || order.Items.Count == 0)
            return;

        var partIds = order.Items.Select(i => i.OrderPartId).Distinct().ToList();
        var parts = await _context.OrderParts
            .AsNoTracking()
            .Include(p => p.Order)
            .Where(p => partIds.Contains(p.Id))
            .ToListAsync(ct);

        var partsById = parts.ToDictionary(p => p.Id);
        var existing = await _context.ManufacturingOrders
            .Where(m => m.CustomerOrderId == customerOrderId)
            .ToListAsync(ct);

        var activePartIds = order.Items.Select(i => i.OrderPartId).ToHashSet();

        foreach (var orphan in existing.Where(m => !activePartIds.Contains(m.OrderPartId) && m.OpeningDate == null))
        {
            _context.ManufacturingOrders.Remove(orphan);
        }

        foreach (var item in order.Items)
        {
            if (!partsById.TryGetValue(item.OrderPartId, out var part) || part.Order == null)
                continue;

            var opNumber = BuildOpNumber(order.OrderNumber, part.Order.OTNumber);
            var receiptPct = 10m;
            var qtyToProduce = CalculateQuantityToProduce(item.Quantity, receiptPct);

            var mo = existing.FirstOrDefault(m => m.OrderPartId == item.OrderPartId);
            if (mo == null)
            {
                mo = new ManufacturingOrder
                {
                    Id = Guid.NewGuid(),
                    CustomerOrderId = order.Id,
                    OrderPartId = item.OrderPartId,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = userName ?? order.CreatedBy
                };
                _context.ManufacturingOrders.Add(mo);
                existing.Add(mo);
            }

            if (mo.OpeningDate != null)
                continue;

            mo.OpNumber = opNumber;
            mo.ProductionOrderId = part.ProductionOrderId;
            mo.OrderNumber = order.OrderNumber;
            mo.OtNumber = part.Order.OTNumber;
            mo.ClientName = order.ClientName;
            mo.ProductName = item.ProductName;
            mo.ReferenceName = item.ReferenceName;
            mo.PurchaseOrderNumber = order.PurchaseOrderNumber;
            mo.AgreedDeliveryDate = order.AgreedDeliveryDate;
            mo.QuantityOrdered = item.Quantity;
            mo.ReceiptPercentage = receiptPct;
            mo.QuantityToProduce = qtyToProduce;
            mo.ApprovedUnitPrice = item.ApprovedUnitPrice;
            mo.Status = "PendienteApertura";
            mo.UpdatedAt = DateTime.UtcNow;
            mo.UpdatedBy = userName ?? order.UpdatedBy;
        }

        await _context.SaveChangesAsync(ct);
    }

    public static string BuildOpNumber(string orderNumber, string otNumber)
    {
        var pedidoDigits = new string((orderNumber ?? string.Empty).Where(char.IsDigit).ToArray());
        if (pedidoDigits.Length > 4)
            pedidoDigits = pedidoDigits[^4..];
        else
            pedidoDigits = pedidoDigits.PadLeft(4, '0');

        var otDigits = new string((otNumber ?? string.Empty).Where(char.IsDigit).ToArray());
        var otSuffix = otDigits.Length >= 2 ? otDigits[^2..] : otDigits.PadLeft(2, '0');

        return $"{pedidoDigits} {otSuffix}";
    }

    public static decimal CalculateQuantityToProduce(decimal quantityOrdered, decimal receiptPercentage)
    {
        if (quantityOrdered <= 0)
            return 0;

        var factor = 1m + (receiptPercentage / 100m);
        return Math.Ceiling(quantityOrdered * factor);
    }
}