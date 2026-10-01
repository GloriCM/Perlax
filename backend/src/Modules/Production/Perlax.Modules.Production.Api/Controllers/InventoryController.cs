using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Inventory;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/inventory")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryConsumptionService _service;
    private readonly IAuditService _audit;

    public InventoryController(IInventoryConsumptionService service, IAuditService audit)
    {
        _service = service;
        _audit = audit;
    }

    [HttpGet("consumptions/next-number")]
    public async Task<ActionResult<string>> NextNumber(CancellationToken ct) =>
        Ok(await _service.GetNextNumberAsync(ct));

    [HttpGet("consumptions")]
    public async Task<ActionResult> ListConsumptions([FromQuery] Guid? manufacturingOrderId, CancellationToken ct) =>
        Ok(await _service.ListAsync(manufacturingOrderId, ct));

    [HttpGet("consumptions/{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct)
    {
        try { return Ok(await _service.GetByIdAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("consumptions")]
    public async Task<ActionResult> Create([FromBody] SaveConsumptionCommand body, CancellationToken ct)
    {
        try
        {
            var result = await _service.CreateAsync(body, User.Identity?.Name ?? "system", ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "CREATE_CONSUMPTION",
                $"Aplicación {result.ApplicationNumber}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("consumptions/{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] SaveConsumptionCommand body, CancellationToken ct)
    {
        try
        {
            await _service.UpdateAsync(id, body, User.Identity?.Name ?? "system", ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("consumptions/{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        try { await _service.DeleteAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("stock")]
    public async Task<ActionResult> Stock(CancellationToken ct) =>
        Ok(await _service.ListStockBalancesAsync(ct));

    [HttpGet("movements")]
    public async Task<ActionResult> Movements([FromQuery] string? productName, CancellationToken ct) =>
        Ok(await _service.ListMovementsAsync(productName, ct));

    [HttpPost("stock/entries")]
    public async Task<ActionResult> StockEntry([FromBody] StockEntryRequest body, CancellationToken ct)
    {
        try
        {
            await _service.RegisterPurchaseEntryAsync(body.ProductName ?? "", body.ProductId, body.Quantity, body.UnitCost, body.Reference,
                User.Identity?.Name ?? "system", ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    public class StockEntryRequest
    {
        public Guid? ProductId { get; set; }
        public string? ProductName { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public string? Reference { get; set; }
    }
}
