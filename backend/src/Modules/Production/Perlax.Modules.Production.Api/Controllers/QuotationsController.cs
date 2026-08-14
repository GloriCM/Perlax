using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Quotations;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/quotations")]
public class QuotationsController : ControllerBase
{
    private readonly IQuotationsService _quotations;
    private readonly IAuditService _auditService;

    public QuotationsController(IQuotationsService quotations, IAuditService auditService)
    {
        _quotations = quotations;
        _auditService = auditService;
    }

    [HttpGet("from-ot")]
    public async Task<ActionResult<IEnumerable<object>>> GetOrdersForQuotation(CancellationToken ct)
    {
        var data = await _quotations.GetOrdersForQuotationAsync(ct);
        return Ok(data.Select(o => new
        {
            id = o.Id,
            otNumber = o.OtNumber,
            cliente = o.Cliente,
            productName = o.ProductName,
            createdAt = o.CreatedAt
        }));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Quotation>>> GetAll(CancellationToken ct) =>
        Ok(await _quotations.ListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Quotation>> GetById(Guid id, CancellationToken ct)
    {
        try { return Ok(await _quotations.GetByIdAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost]
    public async Task<ActionResult<Quotation>> Create([FromBody] QuotationRequest request, CancellationToken ct)
    {
        var entity = await _quotations.CreateAsync(ToCommand(request), CurrentUser(), ct);
        await LogAudit("CREATE_QUOTATION", $"Se creo cotizacion {entity.QuoteNumber} ({entity.SourceType})");
        return Ok(entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Quotation>> Update(Guid id, [FromBody] QuotationRequest request, CancellationToken ct)
    {
        try
        {
            var entity = await _quotations.UpdateAsync(id, ToCommand(request), CurrentUser(), ct);
            await LogAudit("UPDATE_QUOTATION", $"Se actualizo cotizacion {entity.QuoteNumber}");
            return Ok(entity);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            var entity = await _quotations.GetByIdAsync(id, ct);
            await _quotations.DeleteAsync(id, ct);
            await LogAudit("DELETE_QUOTATION", $"Se elimino cotizacion {entity.QuoteNumber}");
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("validate-costs")]
    public ActionResult<object> ValidateCosts([FromBody] ValidateCostsRequest request) =>
        Ok(_quotations.ValidateCosts(new ValidateCostsCommand(
            request.Quantities,
            request.FreightType,
            request.MaterialCost,
            request.PrintCost,
            request.FinishingCost,
            request.HandleCost,
            request.WindowCost,
            request.ProcessCost,
            request.WorkshopCost,
            request.OverheadPercent)));

    [HttpPost("{id:guid}/select-price")]
    public async Task<ActionResult<Quotation>> SelectPrice(Guid id, [FromBody] SelectPriceRequest request, CancellationToken ct)
    {
        try
        {
            var entity = await _quotations.SelectPriceAsync(
                id,
                new SelectPriceCommand(request.SelectedPriceTier, request.SelectedUnitPrice, request.DeliveryConditions, request.PriceConditions),
                CurrentUser(), ct);
            await LogAudit("SELECT_QUOTATION_PRICE", $"Se selecciono precio {request.SelectedPriceTier} para cotizacion {entity.QuoteNumber}");
            return Ok(entity);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    private static SaveQuotationCommand ToCommand(QuotationRequest request) => new(
        request.SourceType,
        request.ProductionOrderId,
        request.ProductionOrderNumber,
        request.ClientName,
        request.ProspectClientName,
        request.ProductName,
        request.RequestDate,
        request.FreightType,
        request.Quantities,
        request.TabsDataJson,
        request.DeliveryConditions,
        request.PriceConditions);

    private string CurrentUser() => User.Identity?.Name ?? "Sistema";

    private Task LogAudit(string action, string details) =>
        _auditService.LogAsync(User.Identity?.Name, User.Identity?.Name, action, details,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

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