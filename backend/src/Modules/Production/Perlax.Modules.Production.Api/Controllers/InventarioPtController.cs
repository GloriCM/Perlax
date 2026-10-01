using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.InventarioPt;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/inventario-pt")]
public class InventarioPtController : ControllerBase
{
    private readonly IFinishedGoodsService _service;
    private readonly IAuditService _audit;

    public InventarioPtController(IFinishedGoodsService service, IAuditService audit)
    {
        _service = service;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] bool onlyWithStock = true, CancellationToken ct = default) =>
        Ok(await _service.ListBalancesAsync(onlyWithStock, ct));

    [HttpGet("{manufacturingOrderId:guid}/entries")]
    public async Task<ActionResult> Entries(Guid manufacturingOrderId, CancellationToken ct) =>
        Ok(await _service.ListEntriesAsync(manufacturingOrderId, ct));

    [HttpPost("entries")]
    public async Task<ActionResult> AddEntry([FromBody] AddEntryRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _service.AddEntryAsync(new AddFinishedGoodsEntryCommand(
                request.ManufacturingOrderId, request.EntryDate, request.Quantity, request.Notes),
                User.Identity?.Name ?? "system", ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "ADD_PT_ENTRY",
                $"Entrada PT OP {request.ManufacturingOrderId}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("returns/next-number")]
    public async Task<ActionResult<string>> NextReturnNumber(CancellationToken ct) =>
        Ok(await _service.GetNextReturnNumberAsync(ct));

    [HttpGet("returns")]
    public async Task<ActionResult> ListReturns(CancellationToken ct) =>
        Ok(await _service.ListReturnsAsync(ct));

    [HttpGet("returns/returnable")]
    public async Task<ActionResult> ListReturnable(CancellationToken ct) =>
        Ok(await _service.ListReturnableAsync(ct));

    [HttpPost("returns")]
    public async Task<ActionResult> AddReturn([FromBody] AddReturnRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _service.AddReturnAsync(new AddFinishedGoodsReturnCommand(
                request.ManufacturingOrderId,
                request.RemisionId,
                request.RemisionItemId,
                request.ReturnDate,
                request.Quantity,
                request.Reason,
                request.Notes),
                User.Identity?.Name ?? "system", ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "ADD_PT_RETURN",
                $"Devolución PT {result.ReturnNumber}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    public class AddEntryRequest
    {
        public Guid ManufacturingOrderId { get; set; }
        public DateTime EntryDate { get; set; }
        public decimal Quantity { get; set; }
        public string? Notes { get; set; }
    }

    public class AddReturnRequest
    {
        public Guid ManufacturingOrderId { get; set; }
        public Guid? RemisionId { get; set; }
        public Guid? RemisionItemId { get; set; }
        public DateTime ReturnDate { get; set; }
        public decimal Quantity { get; set; }
        public string? Reason { get; set; }
        public string? Notes { get; set; }
    }
}
