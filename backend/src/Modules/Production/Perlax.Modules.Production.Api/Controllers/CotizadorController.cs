using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Cotizador;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/cotizador")]
public class CotizadorController : ControllerBase
{
    private readonly ProductionDbContext _context;
    private readonly CotizadorCalculator _calculator;
    private readonly IAuditService _auditService;

    public CotizadorController(ProductionDbContext context, CotizadorCalculator calculator, IAuditService auditService)
    {
        _context = context;
        _calculator = calculator;
        _auditService = auditService;
    }

    [HttpPost("calculate")]
    public async Task<ActionResult<CotizadorCalculateResponse>> Calculate([FromBody] CotizadorCalculateRequest request, CancellationToken ct)
    {
        var result = await _calculator.CalculateAsync(request, ct);
        return Ok(result);
    }

    [HttpGet("materials")]
    public async Task<ActionResult<IEnumerable<object>>> GetMaterials()
    {
        var data = await _context.CotizadorMaterials
            .AsNoTracking()
            .Where(m => m.IsActive)
            .OrderBy(m => m.Name)
            .Select(m => new { id = m.Id, name = m.Name, pricePerM2 = m.PricePerM2 })
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("machines")]
    public async Task<ActionResult<IEnumerable<object>>> GetMachines()
    {
        var data = await _context.CotizadorMachines
            .AsNoTracking()
            .Where(m => m.IsActive && m.ServiceRole == "Impresora")
            .OrderBy(m => m.Name)
            .Select(m => new
            {
                id = m.Id,
                name = m.Name,
                serviceRole = m.ServiceRole,
                setupTimeHours = m.SetupTimeHours,
                shotsPerHour = m.ShotsPerHour,
                hourlyRate = m.HourlyRate
            })
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("planchas")]
    public async Task<ActionResult<IEnumerable<object>>> GetPlanchas()
    {
        var data = await _context.CotizadorPlanchas
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new { id = p.Id, name = p.Name, price = p.Price })
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("micro-flauta")]
    public async Task<ActionResult<IEnumerable<object>>> GetMicroFlauta()
    {
        var data = await _context.CotizadorMicroFlautas
            .AsNoTracking()
            .Where(m => m.IsActive)
            .OrderBy(m => m.Name)
            .Select(m => new { id = m.Id, name = m.Name, pricePerM2 = m.PricePerM2 })
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("orders-for-quote")]
    public async Task<ActionResult<IEnumerable<object>>> GetOrdersForQuote()
    {
        var data = await _context.ProductionOrders
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                id = o.Id,
                otNumber = o.OTNumber,
                cliente = o.Cliente,
                productName = o.ProductName,
                lineaPT = o.LineaPT,
                createdAt = o.CreatedAt
            })
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Quotation>>> List()
    {
        return Ok(await _context.Quotations.OrderByDescending(x => x.CreatedAt).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Quotation>> Get(Guid id)
    {
        var q = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id);
        return q == null ? NotFound() : Ok(q);
    }

    [HttpPost]
    public async Task<ActionResult<Quotation>> Create([FromBody] CotizadorSaveRequest request, CancellationToken ct)
    {
        if (request.CalculationResult == null || !request.CalculationResult.IsValid)
            return BadRequest(new { message = "Debe calcular la cotización antes de guardar." });

        var now = DateTime.UtcNow;
        var entity = new Quotation
        {
            Id = Guid.NewGuid(),
            QuoteNumber = await GetNextQuoteNumber(),
            SourceType = request.SourceType ?? "Manual",
            ProductType = request.ProductType ?? "Caja",
            ProductionOrderId = request.ProductionOrderId,
            ProductionOrderNumber = request.ProductionOrderNumber,
            ClientName = request.ClientName ?? string.Empty,
            SellerName = request.SellerName ?? User.Identity?.Name ?? string.Empty,
            WorkName = request.WorkName ?? string.Empty,
            PartName = request.PartName ?? string.Empty,
            ProductName = request.ProductName ?? request.WorkName ?? string.Empty,
            RequestDate = request.RequestDate ?? now,
            FreightType = request.FreightType ?? "Local",
            QuantitiesJson = JsonSerializer.Serialize(request.Quantities ?? [5000, 10000, 20000, 50000, 100000]),
            PrimaryQuantityIndex = request.PrimaryQuantityIndex,
            FormDataJson = request.FormDataJson ?? "{}",
            CalculationResultJson = JsonSerializer.Serialize(request.CalculationResult),
            Status = "Calculated",
            CreatedAt = now,
            CreatedBy = User.Identity?.Name ?? "Sistema"
        };

        _context.Quotations.Add(entity);
        await _context.SaveChangesAsync(ct);
        await LogAudit("CREATE_COTIZADOR", $"Cotización {entity.QuoteNumber} creada");
        return Ok(entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Quotation>> Update(Guid id, [FromBody] CotizadorSaveRequest request, CancellationToken ct)
    {
        var entity = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return NotFound();
        if (request.CalculationResult == null || !request.CalculationResult.IsValid)
            return BadRequest(new { message = "Debe calcular la cotización antes de guardar." });

        entity.SourceType = request.SourceType ?? entity.SourceType;
        entity.ProductType = request.ProductType ?? entity.ProductType;
        entity.ProductionOrderId = request.ProductionOrderId;
        entity.ProductionOrderNumber = request.ProductionOrderNumber;
        entity.ClientName = request.ClientName ?? entity.ClientName;
        entity.SellerName = request.SellerName ?? entity.SellerName;
        entity.WorkName = request.WorkName ?? entity.WorkName;
        entity.PartName = request.PartName ?? entity.PartName;
        entity.ProductName = request.ProductName ?? entity.ProductName;
        entity.RequestDate = request.RequestDate ?? entity.RequestDate;
        entity.FreightType = request.FreightType ?? entity.FreightType;
        entity.QuantitiesJson = JsonSerializer.Serialize(request.Quantities ?? [5000, 10000, 20000, 50000, 100000]);
        entity.PrimaryQuantityIndex = request.PrimaryQuantityIndex;
        entity.FormDataJson = request.FormDataJson ?? entity.FormDataJson;
        entity.CalculationResultJson = JsonSerializer.Serialize(request.CalculationResult);
        entity.Status = "Calculated";
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = User.Identity?.Name ?? "Sistema";

        await _context.SaveChangesAsync(ct);
        await LogAudit("UPDATE_COTIZADOR", $"Cotización {entity.QuoteNumber} actualizada");
        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return NotFound();
        _context.Quotations.Remove(entity);
        await _context.SaveChangesAsync(ct);
        await LogAudit("DELETE_COTIZADOR", $"Cotización {entity.QuoteNumber} eliminada");
        return NoContent();
    }

    [HttpPost("{id:guid}/convert-to-ot")]
    public async Task<ActionResult<object>> ConvertToOt(Guid id, CancellationToken ct)
    {
        var quote = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (quote == null) return NotFound();

        var otNumber = await GetNextOtNumber();
        var linea = string.Equals(quote.ProductType, "Bolsa", StringComparison.OrdinalIgnoreCase) ? "Bolsa" : "Caja o plegadiza";

        var order = new ProductionOrder
        {
            Id = Guid.NewGuid(),
            OTNumber = otNumber,
            Cliente = quote.ClientName,
            EjecutivoCuenta = quote.SellerName,
            FechaSolicitud = DateTime.UtcNow,
            Asignacion = "Diseño",
            LineaPT = linea,
            NumeroPartes = 1,
            ProductName = string.IsNullOrWhiteSpace(quote.WorkName) ? quote.ProductName : quote.WorkName,
            Status = "Borrador",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = User.Identity?.Name ?? "Sistema",
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

        _context.ProductionOrders.Add(order);
        quote.ProductionOrderId = order.Id;
        quote.ProductionOrderNumber = otNumber;
        quote.UpdatedAt = DateTime.UtcNow;
        quote.UpdatedBy = User.Identity?.Name ?? "Sistema";
        await _context.SaveChangesAsync(ct);
        await LogAudit("CONVERT_COTIZADOR_TO_OT", $"Cotización {quote.QuoteNumber} → OT {otNumber} (borrador)");

        return Ok(new { orderId = order.Id, otNumber, status = order.Status });
    }

    [HttpGet("{id:guid}/pdf/propuesta")]
    public async Task<IActionResult> PdfPropuesta(Guid id, [FromQuery] string tier = "Al3", CancellationToken ct = default)
    {
        var quote = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (quote == null) return NotFound();
        return Content(BuildPdfPlaceholderHtml(quote, "Propuesta Comercial", tier), "text/html; charset=utf-8");
    }

    [HttpGet("{id:guid}/pdf/produccion")]
    public async Task<IActionResult> PdfProduccion(Guid id, CancellationToken ct = default)
    {
        var quote = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (quote == null) return NotFound();
        return Content(BuildPdfPlaceholderHtml(quote, "Hoja de Producción", null), "text/html; charset=utf-8");
    }

    private static string BuildPdfPlaceholderHtml(Quotation q, string title, string? tier)
    {
        var extra = tier != null ? $"<p>Margen seleccionado: {tier}</p>" : "";
        return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" + title + " " + q.QuoteNumber + "</title>" +
               "<style>body{font-family:Arial,sans-serif;padding:32px}h1{color:#1e3a5f}</style></head><body>" +
               "<h1>" + title + "</h1><p>N " + q.QuoteNumber + " | Cliente: " + q.ClientName + "</p>" +
               "<p>Trabajo: " + q.WorkName + "</p>" + extra +
               "<p><em>Plantilla Perla en construccion.</em></p>" +
               "<script>window.print()</script></body></html>";
    }

    private async Task<string> GetNextQuoteNumber()
    {
        var values = await _context.Quotations.Select(x => x.QuoteNumber).ToListAsync();
        var max = 0;
        foreach (var val in values)
        {
            var raw = val?.Replace("COT-", "") ?? string.Empty;
            if (int.TryParse(raw, out var n) && n > max) max = n;
        }
        return $"COT-{(max + 1):D5}";
    }

    private async Task<string> GetNextOtNumber()
    {
        var numbers = await _context.ProductionOrders.Select(o => o.OTNumber).ToListAsync();
        var max = 0;
        foreach (var n in numbers)
            if (int.TryParse(n, out var parsed) && parsed > max) max = parsed;
        return (max + 1).ToString();
    }

    private Task LogAudit(string action, string details) =>
        _auditService.LogAsync(User.Identity?.Name, User.Identity?.Name, action, details,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

    public sealed class CotizadorSaveRequest
    {
        public string? SourceType { get; set; }
        public string? ProductType { get; set; }
        public Guid? ProductionOrderId { get; set; }
        public string? ProductionOrderNumber { get; set; }
        public string? ClientName { get; set; }
        public string? SellerName { get; set; }
        public string? WorkName { get; set; }
        public string? PartName { get; set; }
        public string? ProductName { get; set; }
        public DateTime? RequestDate { get; set; }
        public string? FreightType { get; set; }
        public List<int>? Quantities { get; set; }
        public int PrimaryQuantityIndex { get; set; }
        public string? FormDataJson { get; set; }
        public CotizadorCalculateResponse? CalculationResult { get; set; }
    }
}
