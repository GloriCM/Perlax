using Perlax.Modules.Almacen.Application.Abstractions;
using Perlax.Modules.Production.Application.Inventory;

namespace Perlax.Web.Services;

/// <summary>Al guardar una recepción de Compras, suma la cantidad al libro de saldos.</summary>
public sealed class WarehouseStockEntry : IWarehouseStockEntry
{
    private readonly IInventoryConsumptionService _inventory;

    public WarehouseStockEntry(IInventoryConsumptionService inventory) => _inventory = inventory;

    public Task RegisterEntryAsync(string productName, Guid? productId, decimal quantity, decimal unitCost, string? reference, string userName, CancellationToken ct = default)
        => _inventory.RegisterPurchaseEntryAsync(productName, productId, quantity, unitCost, reference, userName, ct);
}
