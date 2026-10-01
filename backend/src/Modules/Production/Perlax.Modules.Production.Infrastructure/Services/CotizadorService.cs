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

    public async Task<IReadOnlyList<CotizadorBarnizOptionDto>> GetActiveBarnicesAsync(CancellationToken ct = default) =>
        await _db.CotizadorBarnices.AsNoTracking()
            .Where(b => b.IsActive)
            .OrderBy(b => b.Name)
            .Select(b => new CotizadorBarnizOptionDto(b.Id, b.Name, b.Factor))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CotizadorTerminadoOptionDto>> GetActiveTerminadosAsync(CancellationToken ct = default) =>
        await _db.CotizadorTerminados.AsNoTracking()
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .Select(t => new CotizadorTerminadoOptionDto(t.Id, t.Name, t.PricePerM2))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CotizadorCordonOptionDto>> GetActiveCordonesAsync(CancellationToken ct = default) =>
        await _db.CotizadorCordones.AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new CotizadorCordonOptionDto(c.Id, c.Name, c.PricePerManija))
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
        var pieces = ExtractPiecesFromForm(quote.FormDataJson, quote.PartName);

        var order = new ProductionOrder
        {
            Id = Guid.NewGuid(),
            OTNumber = otNumber,
            Cliente = quote.ClientName,
            EjecutivoCuenta = quote.SellerName,
            FechaSolicitud = DateTime.UtcNow,
            Asignacion = "Nuevo",
            LineaPT = linea,
            NumeroPartes = pieces.Count,
            ProductName = string.IsNullOrWhiteSpace(quote.WorkName) ? quote.ProductName : quote.WorkName,
            Status = "Borrador",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName,
            Parts = pieces.Select(p => MapToOrderPart(p)).ToList()
        };
        foreach (var part in order.Parts)
            part.ProductionOrderId = order.Id;

        _db.ProductionOrders.Add(order);
        quote.ProductionOrderId = order.Id;
        quote.ProductionOrderNumber = otNumber;
        quote.UpdatedAt = DateTime.UtcNow;
        quote.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);

        return new ConvertQuoteToOtResultDto(order.Id, otNumber, order.Status);
    }

    private static List<QuotePieceSnapshot> ExtractPiecesFromForm(string? formDataJson, string fallbackPartName)
    {
        var pieces = new List<QuotePieceSnapshot>();
        if (string.IsNullOrWhiteSpace(formDataJson))
        {
            pieces.Add(new QuotePieceSnapshot { PartName = string.IsNullOrWhiteSpace(fallbackPartName) ? "Pieza 1" : fallbackPartName });
            return pieces;
        }

        try
        {
            using var doc = JsonDocument.Parse(formDataJson);
            var root = doc.RootElement;

            if (root.TryGetProperty("pieces", out var arr) && arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() > 0)
            {
                foreach (var el in arr.EnumerateArray())
                    pieces.Add(ParsePieceElement(el));
                return pieces;
            }

            pieces.Add(ParsePieceElement(root, fallbackPartName));
        }
        catch
        {
            pieces.Add(new QuotePieceSnapshot { PartName = string.IsNullOrWhiteSpace(fallbackPartName) ? "Pieza 1" : fallbackPartName });
        }

        return pieces;
    }

    private static QuotePieceSnapshot ParsePieceElement(JsonElement el, string? fallbackName = null)
    {
        string Str(string name) =>
            el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? (p.GetString() ?? "") : "";
        decimal Dec(string name)
        {
            if (!el.TryGetProperty(name, out var p)) return 0;
            if (p.ValueKind == JsonValueKind.Number && p.TryGetDecimal(out var d)) return d;
            if (p.ValueKind == JsonValueKind.String && decimal.TryParse(p.GetString(), out var s)) return s;
            return 0;
        }
        int Int(string name) => (int)Dec(name);
        bool Bool(string name) => el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.True;

        var partName = Str("partName");
        if (string.IsNullOrWhiteSpace(partName)) partName = fallbackName ?? "Pieza 1";

        return new QuotePieceSnapshot
        {
            PartName = partName,
            LargoMm = Dec("largoMm"),
            AnchoMm = Dec("anchoMm"),
            Cabida = Dec("cabida"),
            MaterialName = Str("materialName"),
            MicroName = Str("microName"),
            TerminadoNombre = Str("terminadoNombre"),
            TipoCordon = Str("tipoCordon"),
            LargoCordon = Dec("largoCordon"),
            PrecioTroquel = Dec("precioTroquel"),
            UsaPeliculas = Bool("usaPeliculas"),
            NumeroPlanchas = Int("numeroPlanchas"),
            TipoBarniz = Str("tipoBarniz")
        };
    }

    private static OrderPart MapToOrderPart(QuotePieceSnapshot p) => new()
    {
        Id = Guid.NewGuid(),
        PartName = p.PartName,
        Largo = p.LargoMm,
        Ancho = p.AnchoMm,
        AnchoPliego = p.AnchoMm,
        AltoPliego = p.LargoMm,
        Cabida = p.Cabida > 0 ? p.Cabida.ToString("0.####") : null,
        SustratoSup = string.IsNullOrWhiteSpace(p.MaterialName) ? null : p.MaterialName,
        TipoFlauta = string.IsNullOrWhiteSpace(p.MicroName) ? null : p.MicroName,
        Terminado1 = string.IsNullOrWhiteSpace(p.TerminadoNombre) ? null : p.TerminadoNombre,
        Terminado2 = string.IsNullOrWhiteSpace(p.TipoBarniz) ? null : $"Barniz {p.TipoBarniz}",
        ManijaTipo = string.IsNullOrWhiteSpace(p.TipoCordon) ? null : p.TipoCordon,
        ManijaLargo = p.LargoCordon,
        TroquelNuevo = p.PrecioTroquel > 0,
        CodigoTroquel = p.PrecioTroquel > 0 ? "Por cotizar" : null,
        Notas = p.UsaPeliculas ? "Incluye películas" : null,
        FabricationProcessesJson = p.NumeroPlanchas > 0
            ? JsonSerializer.Serialize(new { numeroPlanchas = p.NumeroPlanchas })
            : null
    };

    private sealed class QuotePieceSnapshot
    {
        public string PartName { get; set; } = "Pieza 1";
        public decimal LargoMm { get; set; }
        public decimal AnchoMm { get; set; }
        public decimal Cabida { get; set; }
        public string MaterialName { get; set; } = "";
        public string MicroName { get; set; } = "";
        public string TerminadoNombre { get; set; } = "";
        public string TipoCordon { get; set; } = "";
        public decimal LargoCordon { get; set; }
        public decimal PrecioTroquel { get; set; }
        public bool UsaPeliculas { get; set; }
        public int NumeroPlanchas { get; set; }
        public string TipoBarniz { get; set; } = "";
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