using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/quotations")]
public class QuotationsController : ControllerBase
{
    private readonly ProductionDbContext _context;
    private readonly IAuditService _auditService;

    public QuotationsController(ProductionDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet("from-ot")]
    public async Task<ActionResult<IEnumerable<object>>> GetOrdersForQuotation()
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
                createdAt = o.CreatedAt
            })
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Quotation>>> GetAll()
    {
        return Ok(await _context.Quotations.OrderByDescending(x => x.CreatedAt).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Quotation>> GetById(Guid id)
    {
        var quotation = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id);
        if (quotation == null) return NotFound();
        return Ok(quotation);
    }

    [HttpPost]
    public async Task<ActionResult<Quotation>> Create([FromBody] QuotationRequest request)
    {
        var now = DateTime.UtcNow;
        var nextQuoteNumber = await GetNextQuoteNumber();

        var entity = new Quotation
        {
            Id = Guid.NewGuid(),
            QuoteNumber = nextQuoteNumber,
            SourceType = request.SourceType,
            ProductionOrderId = request.ProductionOrderId,
            ProductionOrderNumber = request.ProductionOrderNumber,
            ClientName = request.ClientName,
            ProspectClientName = request.ProspectClientName,
            ProductName = request.ProductName,
            RequestDate = request.RequestDate ?? now,
            FreightType = request.FreightType,
            QuantitiesJson = JsonSerializer.Serialize(request.Quantities),
            TabsDataJson = request.TabsDataJson ?? "{}",
            DeliveryConditions = request.DeliveryConditions ?? "Entrega sujeta a programación de producción.",
            PriceConditions = request.PriceConditions ?? "Precios sujetos a cambios según especificaciones finales.",
            CreatedAt = now,
            CreatedBy = User.Identity?.Name ?? "Sistema",
            Status = "Draft"
        };

        _context.Quotations.Add(entity);
        await _context.SaveChangesAsync();
        await LogAudit("CREATE_QUOTATION", $"Se creó cotización {entity.QuoteNumber} ({entity.SourceType})");

        return Ok(entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Quotation>> Update(Guid id, [FromBody] QuotationRequest request)
    {
        var entity = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();

        entity.SourceType = request.SourceType;
        entity.ProductionOrderId = request.ProductionOrderId;
        entity.ProductionOrderNumber = request.ProductionOrderNumber;
        entity.ClientName = request.ClientName;
        entity.ProspectClientName = request.ProspectClientName;
        entity.ProductName = request.ProductName;
        entity.RequestDate = request.RequestDate ?? entity.RequestDate;
        entity.FreightType = request.FreightType;
        entity.QuantitiesJson = JsonSerializer.Serialize(request.Quantities);
        entity.TabsDataJson = request.TabsDataJson ?? "{}";
        entity.DeliveryConditions = request.DeliveryConditions ?? entity.DeliveryConditions;
        entity.PriceConditions = request.PriceConditions ?? entity.PriceConditions;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = User.Identity?.Name ?? "Sistema";

        await _context.SaveChangesAsync();
        await LogAudit("UPDATE_QUOTATION", $"Se actualizó cotización {entity.QuoteNumber}");
        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entity = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();
        _context.Quotations.Remove(entity);
        await _context.SaveChangesAsync();
        await LogAudit("DELETE_QUOTATION", $"Se eliminó cotización {entity.QuoteNumber}");
        return NoContent();
    }

    [HttpPost("validate-costs")]
    public ActionResult<object> ValidateCosts([FromBody] ValidateCostsRequest request)
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

        return Ok(new
        {
            details,
            policy = "Los precios sugeridos BAJO/IDEAL/OPTIMO son calculados por política interna y no son editables en selección final."
        });
    }

    [HttpPost("{id:guid}/select-price")]
    public async Task<ActionResult<Quotation>> SelectPrice(Guid id, [FromBody] SelectPriceRequest request)
    {
        var entity = await _context.Quotations.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return NotFound();

        entity.SelectedPriceTier = request.SelectedPriceTier;
        entity.SelectedUnitPrice = request.SelectedUnitPrice;
        entity.DeliveryConditions = request.DeliveryConditions ?? entity.DeliveryConditions;
        entity.PriceConditions = request.PriceConditions ?? entity.PriceConditions;
        entity.Status = "Finalized";
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = User.Identity?.Name ?? "Sistema";

        await _context.SaveChangesAsync();
        await LogAudit("SELECT_QUOTATION_PRICE", $"Se seleccionó precio {request.SelectedPriceTier} para cotización {entity.QuoteNumber}");
        return Ok(entity);
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

    private Task LogAudit(string action, string details) =>
        _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            action,
            details,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"
        );

    public class QuotationRequest
    {
        public string SourceType { get; set; } = "FromOT";
        public Guid? ProductionOrderId { get; set; }
        public string? ProductionOrderNumber { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string? ProspectClientName { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public DateTime? RequestDate { get; set; }
        public string FreightType { get; set; } = "Local";
        public List<int> Quantities { get; set; } = new() { 1000, 2000, 3000, 5000, 10000 };
        public string? TabsDataJson { get; set; } = "{}";
        public string? DeliveryConditions { get; set; }
        public string? PriceConditions { get; set; }
    }

    public class ValidateCostsRequest
    {
        public List<int> Quantities { get; set; } = new() { 1000, 2000, 3000, 5000, 10000 };
        public string FreightType { get; set; } = "Local";
        public decimal MaterialCost { get; set; }
        public decimal PrintCost { get; set; }
        public decimal FinishingCost { get; set; }
        public decimal HandleCost { get; set; }
        public decimal WindowCost { get; set; }
        public decimal ProcessCost { get; set; }
        public decimal WorkshopCost { get; set; }
        public decimal OverheadPercent { get; set; } = 8m;
    }

    public class SelectPriceRequest
    {
        public string SelectedPriceTier { get; set; } = "Ideal";
        public decimal SelectedUnitPrice { get; set; }
        public string? DeliveryConditions { get; set; }
        public string? PriceConditions { get; set; }
    }
}
