using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Printing;
using Perlax.Modules.Production.Application.Remisiones;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/remisiones")]
public class RemisionesController : ControllerBase
{
    private readonly IRemisionService _service;
    private readonly IAuditService _audit;

    public RemisionesController(IRemisionService service, IAuditService audit)
    {
        _service = service;
        _audit = audit;
    }

    [HttpGet("next-number")]
    public async Task<ActionResult<string>> NextNumber(CancellationToken ct) =>
        Ok(await _service.GetNextNumberAsync(ct));

    [HttpGet("dispatchable")]
    public async Task<ActionResult> Dispatchable([FromQuery] string? clientName, CancellationToken ct) =>
        Ok(await _service.GetDispatchableOrdersAsync(clientName, ct));

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
    public async Task<ActionResult> Create([FromBody] SaveRemisionRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _service.CreateAsync(ToCommand(request), CurrentUser(), ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "CREATE_REMISION",
                $"Remisión {result.RemisionNumber}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] SaveRemisionRequest request, CancellationToken ct)
    {
        try
        {
            await _service.UpdateAsync(id, ToCommand(request), CurrentUser(), ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "UPDATE_REMISION",
                $"Remisión {id}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPut("{id:guid}/transport")]
    public async Task<ActionResult> Transport(Guid id, [FromBody] AssignTransportRequest request, CancellationToken ct)
    {
        try
        {
            await _service.AssignTransportAsync(id, new AssignTransportCommand(
                request.Carrier ?? "", request.Plate, request.Driver, request.Cost, request.Notes), CurrentUser(), ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeleteAsync(id, CurrentUser(), ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("{id:guid}/print")]
    public async Task<IActionResult> PrintRemision(Guid id, CancellationToken ct)
    {
        try
        {
            var rem = await _service.GetByIdAsync(id, ct);
            return Content(CommercialPrintHtml.Remision(rem), "text/html; charset=utf-8");
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    /// <summary>format: local | expor | tickets</summary>
    [HttpGet("{id:guid}/print/ticket")]
    public async Task<IActionResult> PrintTicket(Guid id, [FromQuery] string format = "tickets", CancellationToken ct = default)
    {
        try
        {
            var rem = await _service.GetByIdAsync(id, ct);
            return Content(CommercialPrintHtml.DispatchTicket(rem, format), "text/html; charset=utf-8");
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    private string CurrentUser() => User.Identity?.Name ?? "system";

    private static SaveRemisionCommand ToCommand(SaveRemisionRequest request) => new(
        request.CustomerOrderId,
        request.RemisionDate,
        request.Notes,
        (request.Items ?? []).Select(i => new RemisionItemCommand(
            i.CustomerOrderItemId, i.Quantity, i.DispatchNotes, i.IsFinalDispatch)).ToList());

    public class SaveRemisionRequest
    {
        public Guid CustomerOrderId { get; set; }
        public DateTime RemisionDate { get; set; }
        public string? Notes { get; set; }
        public List<SaveRemisionItemRequest>? Items { get; set; }
    }

    public class SaveRemisionItemRequest
    {
        public Guid CustomerOrderItemId { get; set; }
        public decimal Quantity { get; set; }
        public string? DispatchNotes { get; set; }
        public bool IsFinalDispatch { get; set; }
    }

    public class AssignTransportRequest
    {
        public string? Carrier { get; set; }
        public string? Plate { get; set; }
        public string? Driver { get; set; }
        public decimal Cost { get; set; }
        public string? Notes { get; set; }
    }
}
