using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Facturacion;
using Perlax.Modules.Production.Application.Printing;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/facturas")]
public class FacturasController : ControllerBase
{
    private readonly ISalesInvoiceService _service;
    private readonly IAuditService _audit;

    public FacturasController(ISalesInvoiceService service, IAuditService audit)
    {
        _service = service;
        _audit = audit;
    }

    [HttpGet("next-number")]
    public async Task<ActionResult<string>> NextNumber(CancellationToken ct) =>
        Ok(await _service.GetNextNumberAsync(ct));

    [HttpGet("pending-remisiones")]
    public async Task<ActionResult> Pending([FromQuery] string? clientName, CancellationToken ct) =>
        Ok(await _service.GetPendingRemisionesAsync(clientName, ct));

    [HttpGet]
    public async Task<ActionResult> List(CancellationToken ct) =>
        Ok(await _service.ListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct)
    {
        try { return Ok(await _service.GetByIdAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateInvoiceRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _service.CreateAsync(new CreateSalesInvoiceCommand(
                request.RemisionId, request.InvoiceDate, request.DueDate, request.Notes, request.TaxRate), CurrentUser(), ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "CREATE_INVOICE",
                $"Factura {result.InvoiceNumber}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateInvoiceRequest request, CancellationToken ct)
    {
        try
        {
            await _service.UpdateAsync(id, new UpdateSalesInvoiceCommand(request.InvoiceDate, request.DueDate, request.Notes), CurrentUser(), ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPut("{id:guid}/void")]
    public async Task<ActionResult> Void(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.VoidAsync(id, CurrentUser(), ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "VOID_INVOICE",
                $"Anuló factura {id}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("{id:guid}/print")]
    public async Task<IActionResult> Print(Guid id, CancellationToken ct)
    {
        try
        {
            var inv = await _service.GetByIdAsync(id, ct);
            return Content(CommercialPrintHtml.Factura(inv), "text/html; charset=utf-8");
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    private string CurrentUser() => User.Identity?.Name ?? "system";

    public class CreateInvoiceRequest
    {
        public Guid RemisionId { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Notes { get; set; }
        public decimal? TaxRate { get; set; }
    }

    public class UpdateInvoiceRequest
    {
        public DateTime InvoiceDate { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Notes { get; set; }
    }
}
