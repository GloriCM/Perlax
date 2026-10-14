using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Inventory;
using Perlax.Modules.Production.Application.OpDetail;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class OpDetailService : IOpDetailService
{
    private readonly ProductionDbContext _db;
    private readonly IInventoryConsumptionService _inventory;
    private readonly IOpMaterialPurchaseGateway _purchases;

    public OpDetailService(ProductionDbContext db, IInventoryConsumptionService inventory, IOpMaterialPurchaseGateway purchases)
    {
        _db = db;
        _inventory = inventory;
        _purchases = purchases;
    }

    public async Task<IReadOnlyList<OpMaterialLineDto>> ListMaterialsAsync(Guid manufacturingOrderId, CancellationToken ct = default)
    {
        await CommercialChainSchemaFixes.EnsureOpMaterialRequestColumnsAsync(_db, ct);
        await EnsureOpAsync(manufacturingOrderId, ct);
        var rows = await _db.OpMaterialLines.AsNoTracking()
            .Where(x => x.ManufacturingOrderId == manufacturingOrderId)
            .OrderBy(x => x.PartName).ThenBy(x => x.ProductName)
            .ToListAsync(ct);
        return rows.Select(MapMaterial).ToList();
    }

    public async Task<OpMaterialLineDto> AddMaterialAsync(Guid manufacturingOrderId, SaveOpMaterialCommand command, string userName, CancellationToken ct = default)
    {
        await EnsureOpAsync(manufacturingOrderId, ct);
        if (string.IsNullOrWhiteSpace(command.ProductName))
            throw new InvalidOperationException("El material es obligatorio.");
        if (command.Quantity <= 0)
            throw new InvalidOperationException("La cantidad debe ser mayor a cero.");

        var row = new OpMaterialLine
        {
            Id = Guid.NewGuid(),
            ManufacturingOrderId = manufacturingOrderId,
            PartName = string.IsNullOrWhiteSpace(command.PartName) ? "Pieza" : command.PartName.Trim(),
            Category = string.IsNullOrWhiteSpace(command.Category) ? "MateriaPrima" : command.Category.Trim(),
            ProductId = command.ProductId,
            ProductName = command.ProductName.Trim(),
            Quantity = command.Quantity,
            Unit = string.IsNullOrWhiteSpace(command.Unit) ? "UND" : command.Unit.Trim(),
            UnitCost = Math.Max(0, command.UnitCost),
            Notes = command.Notes,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };
        _db.OpMaterialLines.Add(row);
        await _db.SaveChangesAsync(ct);
        return MapMaterial(row);
    }

    public async Task DeleteMaterialAsync(Guid manufacturingOrderId, Guid lineId, CancellationToken ct = default)
    {
        var row = await _db.OpMaterialLines.FirstOrDefaultAsync(x => x.Id == lineId && x.ManufacturingOrderId == manufacturingOrderId, ct)
            ?? throw new KeyNotFoundException("Material no encontrado.");
        if (row.QuantityFromStock > 0 || row.RequisicionId != null)
            throw new InvalidOperationException("Este material ya se solicitó. No se puede quitar.");
        _db.OpMaterialLines.Remove(row);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<OpMaterialAvailabilityDto> GetMaterialAvailabilityAsync(Guid manufacturingOrderId, Guid lineId, CancellationToken ct = default)
    {
        await CommercialChainSchemaFixes.EnsureOpMaterialRequestColumnsAsync(_db, ct);
        var line = await FindMaterialAsync(manufacturingOrderId, lineId, ct);
        var available = Math.Max(0, await _inventory.GetAvailableByNameAsync(line.ProductName, ct));
        var already = line.RequisicionId != null || line.QuantityFromStock > 0;
        var fromStock = already ? line.QuantityFromStock : Math.Min(available, line.Quantity);
        var toPurchase = already
            ? Math.Max(0, line.Quantity - line.QuantityFromStock)
            : Math.Max(0, line.Quantity - fromStock);
        return new OpMaterialAvailabilityDto(line.Id, line.ProductName, line.Quantity, available, fromStock, toPurchase, already);
    }

    public async Task<RequestOpMaterialResult> RequestMaterialAsync(Guid manufacturingOrderId, Guid lineId, RequestOpMaterialCommand command, string userName, CancellationToken ct = default)
    {
        await CommercialChainSchemaFixes.EnsureOpMaterialRequestColumnsAsync(_db, ct);
        var mo = await EnsureOpAsync(manufacturingOrderId, ct);
        var line = await FindMaterialAsync(manufacturingOrderId, lineId, ct);
        if (line.RequisicionId != null || line.QuantityFromStock > 0)
            throw new InvalidOperationException("Este material ya fue solicitado.");
        if (mo.ClosedAt != null)
            throw new InvalidOperationException("La orden está cerrada.");

        var available = Math.Max(0, await _inventory.GetAvailableByNameAsync(line.ProductName, ct));
        var fromStock = Math.Min(available, line.Quantity);
        if (fromStock > 0 && mo.OpeningDate == null)
            throw new InvalidOperationException("Abra la orden antes de tomar material de bodega.");

        var previewPurchase = line.Quantity - fromStock;
        if (previewPurchase > 0 && string.IsNullOrWhiteSpace(command.TipoRequisicionId))
            throw new InvalidOperationException("Seleccione el tipo de compra para el faltante.");

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            await AdvisoryLock.AcquireAsync(_db, lineId.ToString(), 1, ct);
            await _db.Entry(line).ReloadAsync(ct);
            if (line.RequisicionId != null || line.QuantityFromStock > 0)
                throw new InvalidOperationException("Este material ya fue solicitado.");

            var taken = 0m;
            if (fromStock > 0)
            {
                taken = await _inventory.ConsumeUpToAsync(
                    mo.Id, mo.OpNumber, line.ProductId, line.ProductName, fromStock, line.Unit, line.UnitCost, userName, ct);
            }

            var toPurchase = line.Quantity - taken;
            OpMaterialPurchaseResult? purchase = null;
            if (toPurchase > 0)
            {
                purchase = await _purchases.CreateAsync(new OpMaterialPurchaseRequest(
                    command.TipoRequisicionId!.Trim(),
                    mo.OpNumber,
                    mo.Id,
                    string.IsNullOrWhiteSpace(mo.ClientName) ? "Sin cliente" : mo.ClientName.Trim(),
                    string.IsNullOrWhiteSpace(mo.ReferenceName) ? line.ProductName : mo.ReferenceName.Trim(),
                    line.ProductId,
                    line.ProductName,
                    toPurchase,
                    string.IsNullOrWhiteSpace(line.Unit) ? "UND" : line.Unit.Trim(),
                    mo.ProductionDeliveryDate ?? DateTime.UtcNow,
                    $"Solicitud desde la OP {mo.OpNumber}. Pieza {line.PartName}."), userName, ct);
            }

            line.QuantityFromStock = taken;
            line.RequisicionId = purchase?.RequisicionId;
            line.RequisicionCodigo = purchase?.Codigo;
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return new RequestOpMaterialResult(available, taken, toPurchase, line.RequisicionId, line.RequisicionCodigo);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<IReadOnlyList<OpLaborProcessDto>> ListLaborAsync(Guid manufacturingOrderId, CancellationToken ct = default)
    {
        await EnsureOpAsync(manufacturingOrderId, ct);
        return await _db.OpLaborProcesses.AsNoTracking()
            .Where(x => x.ManufacturingOrderId == manufacturingOrderId)
            .OrderBy(x => x.PartName).ThenBy(x => x.WorkStation)
            .Select(x => new OpLaborProcessDto(x.Id, x.PartName, x.WorkStation, x.Observations, x.Quantity, x.RollWidth, x.CutLength, x.SheetWidth, x.SheetLength, x.Cabida))
            .ToListAsync(ct);
    }

    public async Task<OpLaborProcessDto> AddLaborAsync(Guid manufacturingOrderId, SaveOpLaborCommand command, string userName, CancellationToken ct = default)
    {
        await EnsureOpAsync(manufacturingOrderId, ct);
        if (string.IsNullOrWhiteSpace(command.WorkStation))
            throw new InvalidOperationException("El puesto de trabajo es obligatorio.");

        var row = new OpLaborProcess
        {
            Id = Guid.NewGuid(),
            ManufacturingOrderId = manufacturingOrderId,
            PartName = string.IsNullOrWhiteSpace(command.PartName) ? "Pieza" : command.PartName.Trim(),
            WorkStation = command.WorkStation.Trim(),
            Observations = command.Observations,
            Quantity = command.Quantity,
            RollWidth = command.RollWidth,
            CutLength = command.CutLength,
            SheetWidth = command.SheetWidth,
            SheetLength = command.SheetLength,
            Cabida = command.Cabida,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };
        _db.OpLaborProcesses.Add(row);
        await _db.SaveChangesAsync(ct);
        return new OpLaborProcessDto(row.Id, row.PartName, row.WorkStation, row.Observations, row.Quantity, row.RollWidth, row.CutLength, row.SheetWidth, row.SheetLength, row.Cabida);
    }

    public async Task DeleteLaborAsync(Guid manufacturingOrderId, Guid lineId, CancellationToken ct = default)
    {
        var row = await _db.OpLaborProcesses.FirstOrDefaultAsync(x => x.Id == lineId && x.ManufacturingOrderId == manufacturingOrderId, ct)
            ?? throw new KeyNotFoundException("Proceso no encontrado.");
        _db.OpLaborProcesses.Remove(row);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<OpExternalWorkshopDto>> ListWorkshopsAsync(Guid manufacturingOrderId, CancellationToken ct = default)
    {
        await EnsureOpAsync(manufacturingOrderId, ct);
        return await _db.OpExternalWorkshops.AsNoTracking()
            .Where(x => x.ManufacturingOrderId == manufacturingOrderId)
            .OrderBy(x => x.WorkshopName)
            .Select(x => new OpExternalWorkshopDto(x.Id, x.WorkshopName, x.WorkType, x.DeliveryToWorkshopDate, x.QuantityDelivered, x.Fajado, x.Estresado, x.Empacado, x.UnitPrice, x.Observations, x.ReturnDate, x.ReturnQuantity))
            .ToListAsync(ct);
    }

    public async Task<OpExternalWorkshopDto> AddWorkshopAsync(Guid manufacturingOrderId, SaveOpWorkshopCommand command, string userName, CancellationToken ct = default)
    {
        await EnsureOpAsync(manufacturingOrderId, ct);
        if (string.IsNullOrWhiteSpace(command.WorkshopName))
            throw new InvalidOperationException("El taller es obligatorio.");
        if (command.UnitPrice <= 0)
            throw new InvalidOperationException("El precio unitario del taller debe ser mayor a cero.");

        var row = new OpExternalWorkshop
        {
            Id = Guid.NewGuid(),
            ManufacturingOrderId = manufacturingOrderId,
            WorkshopName = command.WorkshopName.Trim(),
            WorkType = command.WorkType?.Trim() ?? string.Empty,
            DeliveryToWorkshopDate = command.DeliveryToWorkshopDate,
            QuantityDelivered = command.QuantityDelivered,
            Fajado = command.Fajado,
            Estresado = command.Estresado,
            Empacado = command.Empacado,
            UnitPrice = command.UnitPrice,
            Observations = command.Observations,
            ReturnDate = command.ReturnDate,
            ReturnQuantity = command.ReturnQuantity,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };
        _db.OpExternalWorkshops.Add(row);
        await _db.SaveChangesAsync(ct);
        return new OpExternalWorkshopDto(row.Id, row.WorkshopName, row.WorkType, row.DeliveryToWorkshopDate, row.QuantityDelivered, row.Fajado, row.Estresado, row.Empacado, row.UnitPrice, row.Observations, row.ReturnDate, row.ReturnQuantity);
    }

    public async Task DeleteWorkshopAsync(Guid manufacturingOrderId, Guid lineId, CancellationToken ct = default)
    {
        var row = await _db.OpExternalWorkshops.FirstOrDefaultAsync(x => x.Id == lineId && x.ManufacturingOrderId == manufacturingOrderId, ct)
            ?? throw new KeyNotFoundException("Taller no encontrado.");
        _db.OpExternalWorkshops.Remove(row);
        await _db.SaveChangesAsync(ct);
    }

    public async Task SetProductionDeliveryDateAsync(Guid manufacturingOrderId, DateTime? date, string userName, CancellationToken ct = default)
    {
        var mo = await EnsureOpAsync(manufacturingOrderId, ct);
        mo.ProductionDeliveryDate = date.HasValue
            ? (date.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(date.Value, DateTimeKind.Utc)
                : date.Value.ToUniversalTime())
            : null;
        mo.UpdatedAt = DateTime.UtcNow;
        mo.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<OpCostSummaryDto> GetCostSummaryAsync(Guid manufacturingOrderId, CancellationToken ct = default)
    {
        var mo = await EnsureOpAsync(manufacturingOrderId, ct);
        var materials = await _db.OpMaterialLines.AsNoTracking()
            .Where(x => x.ManufacturingOrderId == manufacturingOrderId)
            .SumAsync(x => x.Quantity * x.UnitCost, ct);
        var workshops = await _db.OpExternalWorkshops.AsNoTracking()
            .Where(x => x.ManufacturingOrderId == manufacturingOrderId)
            .SumAsync(x => x.QuantityDelivered * x.UnitPrice, ct);
        var consumptions = await _db.InventoryConsumptions.AsNoTracking()
            .Where(x => x.ManufacturingOrderId == manufacturingOrderId)
            .SumAsync(x => x.Quantity * x.UnitCost, ct);
        var transport = await _db.RemisionItems.AsNoTracking()
            .Include(i => i.Remision)
            .Where(i => i.ManufacturingOrderId == manufacturingOrderId
                        && i.Remision != null
                        && i.Remision.Status != RemisionStatuses.Cancelled)
            .Select(i => i.Remision!.TransportCost)
            .Distinct()
            .SumAsync(ct);

        var total = materials + workshops + consumptions + transport;
        return new OpCostSummaryDto(
            mo.Id,
            mo.OpNumber,
            materials,
            workshops,
            transport,
            consumptions,
            total,
            mo.ApprovedUnitPrice,
            mo.QuantityToProduce,
            mo.ApprovedUnitPrice * mo.QuantityToProduce,
            mo.ProductionDeliveryDate,
            mo.AgreedDeliveryDate,
            mo.ClosedAt,
            mo.Status);
    }

    private async Task<ManufacturingOrder> EnsureOpAsync(Guid id, CancellationToken ct) =>
        await _db.ManufacturingOrders.FirstOrDefaultAsync(m => m.Id == id, ct)
        ?? throw new KeyNotFoundException("Orden de producción no encontrada.");

    private async Task<OpMaterialLine> FindMaterialAsync(Guid manufacturingOrderId, Guid lineId, CancellationToken ct) =>
        await _db.OpMaterialLines.FirstOrDefaultAsync(x => x.Id == lineId && x.ManufacturingOrderId == manufacturingOrderId, ct)
        ?? throw new KeyNotFoundException("Material no encontrado.");

    private static OpMaterialLineDto MapMaterial(OpMaterialLine x) =>
        new(x.Id, x.PartName, x.Category, x.ProductId, x.ProductName, x.Quantity, x.Unit, x.UnitCost, x.Notes, x.QuantityFromStock, x.RequisicionId, x.RequisicionCodigo);
}
