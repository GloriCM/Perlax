using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Quotations;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class QuotationsService : IQuotationsService
{
    private readonly ProductionDbContext _db;

    public QuotationsService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<QuotationOtOptionDto>> GetOrdersForQuotationAsync(CancellationToken ct = default) =>
        await _db.ProductionOrders.AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new QuotationOtOptionDto(o.Id, o.OTNumber, o.Cliente, o.ProductName, o.CreatedAt))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Quotation>> ListAsync(CancellationToken ct = default) =>
        await _db.Quotations.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public async Task<Quotation> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await _db.Quotations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
        ?? throw new KeyNotFoundException("Cotizacion no encontrada.");

    public async Task<Quotation> CreateAsync(SaveQuotationCommand command, string userName, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var entity = new Quotation
        {
            Id = Guid.NewGuid(),
            QuoteNumber = await GetNextQuoteNumberAsync(ct),
            SourceType = command.SourceType,
            ProductionOrderId = command.ProductionOrderId,
            ProductionOrderNumber = command.ProductionOrderNumber,
            ClientName = command.ClientName,
            ProspectClientName = command.ProspectClientName,
            ProductName = command.ProductName,
            RequestDate = command.RequestDate ?? now,
            FreightType = command.FreightType,
            QuantitiesJson = JsonSerializer.Serialize(command.Quantities),
            TabsDataJson = command.TabsDataJson ?? "{}",
            DeliveryConditions = command.DeliveryConditions ?? "Entrega sujeta a programacion de produccion.",
            PriceConditions = command.PriceConditions ?? "Precios sujetos a cambios segun especificaciones finales.",
            CreatedAt = now,
            CreatedBy = userName,
            Status = "Draft"
        };

        _db.Quotations.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<Quotation> UpdateAsync(Guid id, SaveQuotationCommand command, string userName, CancellationToken ct = default)
    {
        var entity = await _db.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada.");

        entity.SourceType = command.SourceType;
        entity.ProductionOrderId = command.ProductionOrderId;
        entity.ProductionOrderNumber = command.ProductionOrderNumber;
        entity.ClientName = command.ClientName;
        entity.ProspectClientName = command.ProspectClientName;
        entity.ProductName = command.ProductName;
        entity.RequestDate = command.RequestDate ?? entity.RequestDate;
        entity.FreightType = command.FreightType;
        entity.QuantitiesJson = JsonSerializer.Serialize(command.Quantities);
        entity.TabsDataJson = command.TabsDataJson ?? "{}";
        entity.DeliveryConditions = command.DeliveryConditions ?? entity.DeliveryConditions;
        entity.PriceConditions = command.PriceConditions ?? entity.PriceConditions;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userName;

        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada.");
        _db.Quotations.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public object ValidateCosts(ValidateCostsCommand request)
    {
        var fleteBase = request.FreightType.Equals("Nacional", StringComparison.OrdinalIgnoreCase) ? 250000m : 120000m;
        var material = request.MaterialCost;
        var impresion = request.PrintCost;
        var terminados = request.FinishingCost;
        var manija = request.HandleCost;
        var ventanilla = request.WindowCost;
        var procesos = request.ProcessCost;
        var talleres = request.WorkshopCost;
        var overhead = request.OverheadPercent / 100m;

        var details = new List<object>();
        foreach (var quantity in request.Quantities.Where(q => q > 0))
        {
            var subtotal = material + impresion + terminados + manija + ventanilla + procesos + talleres;
            var unitCost = subtotal + (fleteBase / quantity);
            unitCost += unitCost * overhead;
            var bajo = Math.Round(unitCost * 1.20m, 2);
            var ideal = Math.Round(unitCost * 1.35m, 2);
            var optimo = Math.Round(unitCost * 1.50m, 2);

            details.Add(new
            {
                quantity,
                costBreakdown = new
                {
                    material,
                    impresion,
                    terminados,
                    manija,
                    ventanilla,
                    procesos,
                    talleres,
                    flete = Math.Round(fleteBase / quantity, 2),
                    overheadPercent = request.OverheadPercent
                },
                totalUnitCost = Math.Round(unitCost, 2),
                suggestedSalePrices = new { bajo, ideal, optimo }
            });
        }

        return new
        {
            details,
            policy = "Los precios sugeridos BAJO/IDEAL/OPTIMO son calculados por politica interna y no son editables en seleccion final."
        };
    }

    public async Task<Quotation> SelectPriceAsync(Guid id, SelectPriceCommand command, string userName, CancellationToken ct = default)
    {
        var entity = await _db.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada.");

        entity.SelectedPriceTier = command.SelectedPriceTier;
        entity.SelectedUnitPrice = command.SelectedUnitPrice;
        entity.DeliveryConditions = command.DeliveryConditions ?? entity.DeliveryConditions;
        entity.PriceConditions = command.PriceConditions ?? entity.PriceConditions;
        entity.Status = "Finalized";
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userName;

        await _db.SaveChangesAsync(ct);
        return entity;
    }

    private async Task<string> GetNextQuoteNumberAsync(CancellationToken ct)
    {
        var values = await _db.Quotations.Select(x => x.QuoteNumber).ToListAsync(ct);
        var max = 0;
        foreach (var val in values)
        {
            var raw = val?.Replace("COT-", "") ?? string.Empty;
            if (int.TryParse(raw, out var n) && n > max) max = n;
        }
        return $"COT-{(max + 1):D5}";
    }
}