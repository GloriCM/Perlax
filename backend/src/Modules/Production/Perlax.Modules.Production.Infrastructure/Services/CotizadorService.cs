using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Cotizador;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Cotizador;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed partial class CotizadorService : ICotizadorService
{
    private readonly ProductionDbContext _db;
    private readonly CotizadorCalculator _calculator;

    public CotizadorService(ProductionDbContext db, CotizadorCalculator calculator)
    {
        _db = db;
        _calculator = calculator;
    }

    public Task<CotizadorCalculateResponse> CalculateAsync(CotizadorCalculateRequest request, CancellationToken ct = default) =>
        _calculator.CalculateAsync(request, ct);

    public async Task<IReadOnlyList<CotizadorMaterialOptionDto>> GetActiveMaterialsAsync(CancellationToken ct = default) =>
        await _db.CotizadorMaterials.AsNoTracking()
            .Where(m => m.IsActive)
            .OrderBy(m => m.Name)
            .Select(m => new CotizadorMaterialOptionDto(m.Id, m.Name, m.PricePerM2))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CotizadorMachineOptionDto>> GetActivePrintersAsync(CancellationToken ct = default) =>
        await _db.CotizadorMachines.AsNoTracking()
            .Where(m => m.IsActive && m.ServiceRole == "Impresora")
            .OrderBy(m => m.Name)
            .Select(m => new CotizadorMachineOptionDto(m.Id, m.Name, m.ServiceRole, m.SetupTimeHours, m.ShotsPerHour, m.HourlyRate))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CotizadorPlanchaOptionDto>> GetActivePlanchasAsync(CancellationToken ct = default) =>
        await _db.CotizadorPlanchas.AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new CotizadorPlanchaOptionDto(p.Id, p.Name, p.Price))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CotizadorMicroOptionDto>> GetActiveMicroFlautasAsync(CancellationToken ct = default) =>
        await _db.CotizadorMicroFlautas.AsNoTracking()
            .Where(m => m.IsActive)
            .OrderBy(m => m.Name)
            .Select(m => new CotizadorMicroOptionDto(m.Id, m.Name, m.PricePerM2))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CotizadorOrderForQuoteDto>> GetOrdersForQuoteAsync(CancellationToken ct = default) =>
        await _db.ProductionOrders.AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new CotizadorOrderForQuoteDto(o.Id, o.OTNumber, o.Cliente, o.ProductName, o.LineaPT, o.CreatedAt))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Quotation>> ListQuotationsAsync(CancellationToken ct = default) =>
        await _db.Quotations.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public async Task<Quotation> GetQuotationAsync(Guid id, CancellationToken ct = default) =>
        await _db.Quotations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
        ?? throw new KeyNotFoundException("Cotizacion no encontrada.");

    public async Task<Quotation> CreateQuotationAsync(CotizadorSaveCommand command, string userName, CancellationToken ct = default)
    {
        if (command.CalculationResult == null || !command.CalculationResult.IsValid)
            throw new InvalidOperationException("Debe calcular la cotizacion antes de guardar.");

        var now = DateTime.UtcNow;
        var entity = new Quotation
        {
            Id = Guid.NewGuid(),
            QuoteNumber = await GetNextQuoteNumberAsync(ct),
            SourceType = command.SourceType ?? "Manual",
            ProductType = command.ProductType ?? "Caja",
            ProductionOrderId = command.ProductionOrderId,
            ProductionOrderNumber = command.ProductionOrderNumber,
            ClientName = command.ClientName ?? string.Empty,
            SellerName = command.SellerName ?? userName,
            WorkName = command.WorkName ?? string.Empty,
            PartName = command.PartName ?? string.Empty,
            ProductName = command.ProductName ?? command.WorkName ?? string.Empty,
            RequestDate = command.RequestDate ?? now,
            FreightType = command.FreightType ?? "Local",
            QuantitiesJson = JsonSerializer.Serialize(command.Quantities ?? [5000, 10000, 20000, 50000, 100000]),
            PrimaryQuantityIndex = command.PrimaryQuantityIndex,
            FormDataJson = command.FormDataJson ?? "{}",
            CalculationResultJson = JsonSerializer.Serialize(command.CalculationResult),
            Status = "Calculated",
            CreatedAt = now,
            CreatedBy = userName
        };

        _db.Quotations.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<Quotation> UpdateQuotationAsync(Guid id, CotizadorSaveCommand command, string userName, CancellationToken ct = default)
    {
        var entity = await _db.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada.");
        if (command.CalculationResult == null || !command.CalculationResult.IsValid)
            throw new InvalidOperationException("Debe calcular la cotizacion antes de guardar.");

        entity.SourceType = command.SourceType ?? entity.SourceType;
        entity.ProductType = command.ProductType ?? entity.ProductType;
        entity.ProductionOrderId = command.ProductionOrderId;
        entity.ProductionOrderNumber = command.ProductionOrderNumber;
        entity.ClientName = command.ClientName ?? entity.ClientName;
        entity.SellerName = command.SellerName ?? entity.SellerName;
        entity.WorkName = command.WorkName ?? entity.WorkName;
        entity.PartName = command.PartName ?? entity.PartName;
        entity.ProductName = command.ProductName ?? entity.ProductName;
        entity.RequestDate = command.RequestDate ?? entity.RequestDate;
        entity.FreightType = command.FreightType ?? entity.FreightType;
        entity.QuantitiesJson = JsonSerializer.Serialize(command.Quantities ?? [5000, 10000, 20000, 50000, 100000]);
        entity.PrimaryQuantityIndex = command.PrimaryQuantityIndex;
        entity.FormDataJson = command.FormDataJson ?? entity.FormDataJson;
        entity.CalculationResultJson = JsonSerializer.Serialize(command.CalculationResult);
        entity.Status = "Calculated";
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userName;

        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task DeleteQuotationAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada.");
        _db.Quotations.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ConvertQuoteToOtResultDto> ConvertToOtAsync(Guid id, string userName, CancellationToken ct = default)
    {
        var quote = await _db.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cotizacion no encontrada.");

        var otNumber = await GetNextOtNumberAsync(ct);
        var linea = string.Equals(quote.ProductType, "Bolsa", StringComparison.OrdinalIgnoreCase) ? "Bolsa" : "Caja o plegadiza";

        var order = new ProductionOrder
        {
            Id = Guid.NewGuid(),
            OTNumber = otNumber,
            Cliente = quote.ClientName,
            EjecutivoCuenta = quote.SellerName,
            FechaSolicitud = DateTime.UtcNow,
            Asignacion = "Nuevo",
            LineaPT = linea,
            NumeroPartes = 1,
            ProductName = string.IsNullOrWhiteSpace(quote.WorkName) ? quote.ProductName : quote.WorkName,
            Status = "Borrador",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName,
            Parts =
            [
                new OrderPart
                {
                    Id = Guid.NewGuid(),
                    PartName = string.IsNullOrWhiteSpace(quote.PartName) ? "Pieza 1" : quote.PartName,
                    ProductionOrderId = Guid.Empty
                }
            ]
        };
        order.Parts.First().ProductionOrderId = order.Id;

        _db.ProductionOrders.Add(order);
        quote.ProductionOrderId = order.Id;
        quote.ProductionOrderNumber = otNumber;
        quote.UpdatedAt = DateTime.UtcNow;
        quote.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);

        return new ConvertQuoteToOtResultDto(order.Id, otNumber, order.Status);
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

    private async Task<string> GetNextOtNumberAsync(CancellationToken ct)
    {
        var numbers = await _db.ProductionOrders.Select(o => o.OTNumber).ToListAsync(ct);
        var max = 0;
        foreach (var n in numbers)
            if (int.TryParse(n, out var parsed) && parsed > max) max = parsed;
        return (max + 1).ToString();
    }
}