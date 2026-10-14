using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Inventory;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class InventoryConsumptionService : IInventoryConsumptionService
{
    private readonly ProductionDbContext _db;

    public InventoryConsumptionService(ProductionDbContext db) => _db = db;

    public async Task<string> GetNextNumberAsync(CancellationToken ct = default)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"AP-{year}-";
        var last = await _db.InventoryConsumptions
            .Where(x => x.ApplicationNumber.StartsWith(prefix))
            .OrderByDescending(x => x.ApplicationNumber)
            .Select(x => x.ApplicationNumber)
            .FirstOrDefaultAsync(ct);
        var next = 1;
        if (!string.IsNullOrEmpty(last) && int.TryParse(last.AsSpan(prefix.Length), out var n))
            next = n + 1;
        return $"{prefix}{next:D5}";
    }

    public async Task<IReadOnlyList<InventoryConsumptionDto>> ListAsync(Guid? manufacturingOrderId = null, CancellationToken ct = default)
    {
        var q = _db.InventoryConsumptions.AsNoTracking().AsQueryable();
        if (manufacturingOrderId.HasValue)
            q = q.Where(x => x.ManufacturingOrderId == manufacturingOrderId.Value);

        var rows = await q.OrderByDescending(x => x.ApplicationDate).ToListAsync(ct);
        return rows.Select(Map).ToList();
    }

    public Task<IReadOnlyList<InventoryConsumptionDto>> ListByOpAsync(Guid manufacturingOrderId, CancellationToken ct = default) =>
        ListAsync(manufacturingOrderId, ct);

    public async Task<InventoryConsumptionDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.InventoryConsumptions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Aplicación no encontrada.");
        return Map(row);
    }

    public async Task<InventoryConsumptionDto> CreateAsync(SaveConsumptionCommand command, string userName, CancellationToken ct = default)
    {
        var mo = await ValidateCommandAsync(command, ct);
        var row = new InventoryConsumption
        {
            Id = Guid.NewGuid(),
            ApplicationNumber = await GetNextNumberAsync(ct),
            ManufacturingOrderId = mo.Id,
            OpNumber = mo.OpNumber,
            ProductId = command.ProductId,
            ProductName = command.ProductName.Trim(),
            Quantity = command.Quantity,
            Unit = string.IsNullOrWhiteSpace(command.Unit) ? "UND" : command.Unit.Trim(),
            UnitCost = Math.Max(0, command.UnitCost),
            DeliveredTo = command.DeliveredTo.Trim(),
            ApplicationDate = ToUtc(command.ApplicationDate),
            Notes = command.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };

        _db.InventoryConsumptions.Add(row);
        _db.WarehouseStockMovements.Add(new WarehouseStockMovement
        {
            Id = Guid.NewGuid(),
            ProductId = row.ProductId,
            ProductName = row.ProductName,
            MovementType = "Salida",
            Quantity = row.Quantity,
            UnitCost = row.UnitCost,
            Reference = row.ApplicationNumber,
            ManufacturingOrderId = row.ManufacturingOrderId,
            ConsumptionId = row.Id,
            MovementDate = row.ApplicationDate,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        });

        await _db.SaveChangesAsync(ct);
        return Map(row);
    }

    public async Task UpdateAsync(Guid id, SaveConsumptionCommand command, string userName, CancellationToken ct = default)
    {
        var row = await _db.InventoryConsumptions.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Aplicación no encontrada.");
        var mo = await ValidateCommandAsync(command, ct);

        row.ManufacturingOrderId = mo.Id;
        row.OpNumber = mo.OpNumber;
        row.ProductId = command.ProductId;
        row.ProductName = command.ProductName.Trim();
        row.Quantity = command.Quantity;
        row.Unit = string.IsNullOrWhiteSpace(command.Unit) ? "UND" : command.Unit.Trim();
        row.UnitCost = Math.Max(0, command.UnitCost);
        row.DeliveredTo = command.DeliveredTo.Trim();
        row.ApplicationDate = ToUtc(command.ApplicationDate);
        row.Notes = command.Notes;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = userName;

        var mov = await _db.WarehouseStockMovements.FirstOrDefaultAsync(m => m.ConsumptionId == id, ct);
        if (mov != null)
        {
            mov.ProductId = row.ProductId;
            mov.ProductName = row.ProductName;
            mov.Quantity = row.Quantity;
            mov.UnitCost = row.UnitCost;
            mov.ManufacturingOrderId = row.ManufacturingOrderId;
            mov.MovementDate = row.ApplicationDate;
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.InventoryConsumptions.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Aplicación no encontrada.");
        var movs = await _db.WarehouseStockMovements.Where(m => m.ConsumptionId == id).ToListAsync(ct);
        _db.WarehouseStockMovements.RemoveRange(movs);
        _db.InventoryConsumptions.Remove(row);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<StockBalanceDto>> ListStockBalancesAsync(CancellationToken ct = default)
    {
        var movs = await _db.WarehouseStockMovements.AsNoTracking().ToListAsync(ct);
        return movs
            .GroupBy(m => new { m.ProductId, Name = m.ProductName.Trim() })
            .Select(g =>
            {
                var purchased = g.Where(x => x.MovementType == "Entrada").Sum(x => x.Quantity);
                var consumed = g.Where(x => x.MovementType == "Salida").Sum(x => x.Quantity);
                var lastCost = g.OrderByDescending(x => x.MovementDate).Select(x => x.UnitCost).FirstOrDefault();
                return new StockBalanceDto(g.Key.ProductId, g.Key.Name, purchased, consumed, purchased - consumed, lastCost);
            })
            .OrderBy(x => x.ProductName)
            .ToList();
    }

    public async Task<IReadOnlyList<StockMovementDto>> ListMovementsAsync(string? productName = null, CancellationToken ct = default)
    {
        var q = _db.WarehouseStockMovements.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(productName))
        {
            var p = productName.Trim().ToLower();
            q = q.Where(x => x.ProductName.ToLower() == p);
        }

        return await q.OrderByDescending(x => x.MovementDate)
            .Select(x => new StockMovementDto(x.Id, x.ProductName, x.MovementType, x.Quantity, x.UnitCost, x.Reference, x.MovementDate, x.CreatedBy))
            .ToListAsync(ct);
    }

    public async Task RegisterPurchaseEntryAsync(string productName, Guid? productId, decimal quantity, decimal unitCost, string? reference, string userName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(productName))
            throw new InvalidOperationException("El producto es obligatorio.");
        if (quantity <= 0)
            throw new InvalidOperationException("La cantidad debe ser mayor a cero.");

        _db.WarehouseStockMovements.Add(new WarehouseStockMovement
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            ProductName = productName.Trim(),
            MovementType = "Entrada",
            Quantity = quantity,
            UnitCost = Math.Max(0, unitCost),
            Reference = reference,
            MovementDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<decimal> GetAvailableByNameAsync(string productName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(productName))
            return 0;

        var key = productName.Trim().ToLower();
        var movs = await _db.WarehouseStockMovements.AsNoTracking()
            .Where(m => m.ProductName.ToLower() == key)
            .ToListAsync(ct);
        var purchased = movs.Where(x => x.MovementType == "Entrada").Sum(x => x.Quantity);
        var consumed = movs.Where(x => x.MovementType == "Salida").Sum(x => x.Quantity);
        return purchased - consumed;
    }

    public async Task<decimal> ConsumeUpToAsync(
        Guid manufacturingOrderId,
        string opNumber,
        Guid? productId,
        string productName,
        decimal quantity,
        string unit,
        decimal unitCost,
        string userName,
        CancellationToken ct = default)
    {
        if (quantity <= 0 || string.IsNullOrWhiteSpace(productName))
            return 0;

        var mo = await _db.ManufacturingOrders.FirstOrDefaultAsync(m => m.Id == manufacturingOrderId, ct)
            ?? throw new KeyNotFoundException("OP no encontrada.");
        if (mo.OpeningDate == null)
            throw new InvalidOperationException("Abra la orden antes de tomar material de bodega.");
        if (mo.ClosedAt != null)
            throw new InvalidOperationException("La orden está cerrada.");

        var key = productName.Trim().ToLower();
        await AdvisoryLock.AcquireAsync(_db, key, 0, ct);
        var locked = await _db.WarehouseStockMovements
            .Where(m => m.ProductName.ToLower() == key)
            .ToListAsync(ct);

        var net = locked.Where(x => x.MovementType == "Entrada").Sum(x => x.Quantity)
            - locked.Where(x => x.MovementType == "Salida").Sum(x => x.Quantity);
        var remaining = Math.Min(quantity, Math.Max(0, net));
        if (remaining <= 0)
            return 0;

        var buckets = locked
            .GroupBy(m => m.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                Name = g.Select(x => x.ProductName).FirstOrDefault() ?? productName.Trim(),
                Available = g.Where(x => x.MovementType == "Entrada").Sum(x => x.Quantity)
                    - g.Where(x => x.MovementType == "Salida").Sum(x => x.Quantity),
                LastCost = g.OrderByDescending(x => x.MovementDate).Select(x => x.UnitCost).FirstOrDefault()
            })
            .Where(b => b.Available > 0)
            .OrderByDescending(b => b.ProductId == productId)
            .ToList();

        var year = DateTime.UtcNow.Year;
        var prefix = $"AP-{year}-";
        var last = await _db.InventoryConsumptions
            .Where(x => x.ApplicationNumber.StartsWith(prefix))
            .OrderByDescending(x => x.ApplicationNumber)
            .Select(x => x.ApplicationNumber)
            .FirstOrDefaultAsync(ct);
        var next = 1;
        if (!string.IsNullOrEmpty(last) && int.TryParse(last.AsSpan(prefix.Length), out var n))
            next = n + 1;

        var taken = 0m;
        var normalizedUnit = string.IsNullOrWhiteSpace(unit) ? "UND" : unit.Trim();
        foreach (var bucket in buckets)
        {
            if (remaining <= 0)
                break;
            var slice = Math.Min(remaining, bucket.Available);
            var row = new InventoryConsumption
            {
                Id = Guid.NewGuid(),
                ApplicationNumber = $"{prefix}{next:D5}",
                ManufacturingOrderId = mo.Id,
                OpNumber = string.IsNullOrWhiteSpace(opNumber) ? mo.OpNumber : opNumber,
                ProductId = bucket.ProductId,
                ProductName = bucket.Name,
                Quantity = slice,
                Unit = normalizedUnit,
                UnitCost = bucket.LastCost > 0 ? bucket.LastCost : Math.Max(0, unitCost),
                DeliveredTo = "Bodega",
                ApplicationDate = DateTime.UtcNow,
                Notes = "Toma de inventario al solicitar material de la OP.",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userName
            };
            _db.InventoryConsumptions.Add(row);
            _db.WarehouseStockMovements.Add(new WarehouseStockMovement
            {
                Id = Guid.NewGuid(),
                ProductId = row.ProductId,
                ProductName = row.ProductName,
                MovementType = "Salida",
                Quantity = slice,
                UnitCost = row.UnitCost,
                Reference = row.ApplicationNumber,
                ManufacturingOrderId = mo.Id,
                ConsumptionId = row.Id,
                MovementDate = row.ApplicationDate,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userName
            });
            taken += slice;
            remaining -= slice;
            next++;
        }

        return taken;
    }

    private async Task<ManufacturingOrder> ValidateCommandAsync(SaveConsumptionCommand command, CancellationToken ct)
    {
        if (command.Quantity <= 0)
            throw new InvalidOperationException("La cantidad debe ser mayor a cero.");
        if (string.IsNullOrWhiteSpace(command.ProductName))
            throw new InvalidOperationException("El producto es obligatorio.");
        if (string.IsNullOrWhiteSpace(command.DeliveredTo))
            throw new InvalidOperationException("Debe indicar a quién se entrega el material.");

        var mo = await _db.ManufacturingOrders.FirstOrDefaultAsync(m => m.Id == command.ManufacturingOrderId, ct)
            ?? throw new KeyNotFoundException("OP no encontrada.");
        if (mo.OpeningDate == null)
            throw new InvalidOperationException("Solo se aplican materiales a OP abiertas.");
        if (string.Equals(mo.Status, "Cerrada", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("No se pueden aplicar materiales a una OP cerrada.");
        return mo;
    }

    private static InventoryConsumptionDto Map(InventoryConsumption x) =>
        new(x.Id, x.ApplicationNumber, x.ManufacturingOrderId, x.OpNumber, x.ProductId, x.ProductName, x.Quantity, x.Unit, x.UnitCost, x.DeliveredTo, x.ApplicationDate, x.Notes);

    private static DateTime ToUtc(DateTime value) =>
        value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
}
