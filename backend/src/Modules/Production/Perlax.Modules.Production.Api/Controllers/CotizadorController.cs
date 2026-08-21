using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Cotizador;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/cotizador")]
public class CotizadorController : ControllerBase
{
    private readonly ICotizadorService _cotizador;
    private readonly IAuditService _auditService;

    public CotizadorController(ICotizadorService cotizador, IAuditService auditService)
    {
        _cotizador = cotizador;
        _auditService = auditService;
    }

    [HttpPost("calculate")]
    public async Task<ActionResult<CotizadorCalculateResponse>> Calculate([FromBody] CotizadorCalculateRequest request, CancellationToken ct)
    {
        var result = await _cotizador.CalculateAsync(request, ct);
        return Ok(result);
    }

    [HttpGet("materials")]
    public async Task<ActionResult<IEnumerable<object>>> GetMaterials(CancellationToken ct)
    {
        var data = await _cotizador.GetActiveMaterialsAsync(ct);
        return Ok(data.Select(m => new { id = m.Id, name = m.Name, pricePerM2 = m.PricePerM2 }));
    }

    [HttpGet("machines")]
    public async Task<ActionResult<IEnumerable<object>>> GetMachines(CancellationToken ct)
    {
        var data = await _cotizador.GetActivePrintersAsync(ct);
        return Ok(data.Select(m => new
        {
            id = m.Id,
            name = m.Name,
            serviceRole = m.ServiceRole,
            setupTimeHours = m.SetupTimeHours,
            shotsPerHour = m.ShotsPerHour,
            hourlyRate = m.HourlyRate
        }));
    }

    [HttpGet("planchas")]
    public async Task<ActionResult<IEnumerable<object>>> GetPlanchas(CancellationToken ct)
    {
        var data = await _cotizador.GetActivePlanchasAsync(ct);
        return Ok(data.Select(p => new { id = p.Id, name = p.Name, price = p.Price }));
    }

    [HttpGet("micro-flauta")]
    public async Task<ActionResult<IEnumerable<object>>> GetMicroFlauta(CancellationToken ct)
    {
        var data = await _cotizador.GetActiveMicroFlautasAsync(ct);
        return Ok(data.Select(m => new { id = m.Id, name = m.Name, pricePerM2 = m.PricePerM2 }));
    }

    [HttpGet("orders-for-quote")]
    public async Task<ActionResult<IEnumerable<object>>> GetOrdersForQuote(CancellationToken ct)
    {
        var data = await _cotizador.GetOrdersForQuoteAsync(ct);
        return Ok(data.Select(o => new
        {
            id = o.Id,
            otNumber = o.OtNumber,
            cliente = o.Cliente,
            productName = o.ProductName,
            lineaPT = o.LineaPT,
            createdAt = o.CreatedAt
        }));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Quotation>>> List(CancellationToken ct) =>
        Ok(await _cotizador.ListQuotationsAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Quotation>> Get(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await _cotizador.GetQuotationAsync(id, ct));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost]
    public async Task<ActionResult<Quotation>> Create([FromBody] CotizadorSaveRequest request, CancellationToken ct)
    {
        try
        {
            var entity = await _cotizador.CreateQuotationAsync(ToCommand(request), CurrentUserName(), ct);
            await LogAudit("CREATE_COTIZADOR", $"Cotizacion {entity.QuoteNumber} creada");
            return Ok(entity);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Quotation>> Update(Guid id, [FromBody] CotizadorSaveRequest request, CancellationToken ct)
    {
        try
        {
            var entity = await _cotizador.UpdateQuotationAsync(id, ToCommand(request), CurrentUserName(), ct);
            await LogAudit("UPDATE_COTIZADOR", $"Cotizacion {entity.QuoteNumber} actualizada");
            return Ok(entity);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            var quote = await _cotizador.GetQuotationAsync(id, ct);
            await _cotizador.DeleteQuotationAsync(id, ct);
            await LogAudit("DELETE_COTIZADOR", $"Cotizacion {quote.QuoteNumber} eliminada");
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id:guid}/convert-to-ot")]
    public async Task<ActionResult<object>> ConvertToOt(Guid id, CancellationToken ct)
    {
        try
        {
            var quote = await _cotizador.GetQuotationAsync(id, ct);
            var result = await _cotizador.ConvertToOtAsync(id, CurrentUserName(), ct);
            await LogAudit("CONVERT_COTIZADOR_TO_OT", $"Cotizacion {quote.QuoteNumber} -> OT {result.OtNumber} (borrador)");
            return Ok(new { orderId = result.OrderId, otNumber = result.OtNumber, status = result.Status });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/pdf/propuesta")]
    public async Task<IActionResult> PdfPropuesta(Guid id, [FromQuery] string tier = "Al3", CancellationToken ct = default)
    {
        try
        {
            var quote = await _cotizador.GetQuotationAsync(id, ct);
            return Content(BuildPdfPlaceholderHtml(quote, "Propuesta Comercial", tier), "text/html; charset=utf-8");
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/pdf/produccion")]
    public async Task<IActionResult> PdfProduccion(Guid id, CancellationToken ct = default)
    {
        try
        {
            var quote = await _cotizador.GetQuotationAsync(id, ct);
            return Content(BuildPdfPlaceholderHtml(quote, "Hoja de Produccion", null), "text/html; charset=utf-8");
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    private static CotizadorSaveCommand ToCommand(CotizadorSaveRequest request) => new()
    {
        SourceType = request.SourceType,
        ProductType = request.ProductType,
        ProductionOrderId = request.ProductionOrderId,
        ProductionOrderNumber = request.ProductionOrderNumber,
        ClientName = request.ClientName,
        SellerName = request.SellerName,
        WorkName = request.WorkName,
        PartName = request.PartName,
        ProductName = request.ProductName,
        RequestDate = request.RequestDate,
        FreightType = request.FreightType,
        Quantities = request.Quantities,
        PrimaryQuantityIndex = request.PrimaryQuantityIndex,
        FormDataJson = request.FormDataJson,
        CalculationResult = request.CalculationResult
    };

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

    private string CurrentUserName() => User.Identity?.Name ?? "Sistema";

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