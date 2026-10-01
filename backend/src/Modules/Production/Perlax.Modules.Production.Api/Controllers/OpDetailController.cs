using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.OpDetail;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/manufacturing-orders/{opId:guid}")]
public class OpDetailController : ControllerBase
{
    private readonly IOpDetailService _service;

    public OpDetailController(IOpDetailService service) => _service = service;

    [HttpGet("materials")]
    public async Task<ActionResult> Materials(Guid opId, CancellationToken ct) =>
        Ok(await _service.ListMaterialsAsync(opId, ct));

    [HttpPost("materials")]
    public async Task<ActionResult> AddMaterial(Guid opId, [FromBody] SaveOpMaterialCommand body, CancellationToken ct)
    {
        try { return Ok(await _service.AddMaterialAsync(opId, body, User.Identity?.Name ?? "system", ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("materials/{lineId:guid}")]
    public async Task<ActionResult> DeleteMaterial(Guid opId, Guid lineId, CancellationToken ct)
    {
        try { await _service.DeleteMaterialAsync(opId, lineId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("labor")]
    public async Task<ActionResult> Labor(Guid opId, CancellationToken ct) =>
        Ok(await _service.ListLaborAsync(opId, ct));

    [HttpPost("labor")]
    public async Task<ActionResult> AddLabor(Guid opId, [FromBody] SaveOpLaborCommand body, CancellationToken ct)
    {
        try { return Ok(await _service.AddLaborAsync(opId, body, User.Identity?.Name ?? "system", ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("labor/{lineId:guid}")]
    public async Task<ActionResult> DeleteLabor(Guid opId, Guid lineId, CancellationToken ct)
    {
        try { await _service.DeleteLaborAsync(opId, lineId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("workshops")]
    public async Task<ActionResult> Workshops(Guid opId, CancellationToken ct) =>
        Ok(await _service.ListWorkshopsAsync(opId, ct));

    [HttpPost("workshops")]
    public async Task<ActionResult> AddWorkshop(Guid opId, [FromBody] SaveOpWorkshopCommand body, CancellationToken ct)
    {
        try { return Ok(await _service.AddWorkshopAsync(opId, body, User.Identity?.Name ?? "system", ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("workshops/{lineId:guid}")]
    public async Task<ActionResult> DeleteWorkshop(Guid opId, Guid lineId, CancellationToken ct)
    {
        try { await _service.DeleteWorkshopAsync(opId, lineId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPut("production-delivery-date")]
    public async Task<ActionResult> SetDelivery(Guid opId, [FromBody] DeliveryDateRequest body, CancellationToken ct)
    {
        try
        {
            await _service.SetProductionDeliveryDateAsync(opId, body.ProductionDeliveryDate, User.Identity?.Name ?? "system", ct);
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("cost-summary")]
    public async Task<ActionResult> CostSummary(Guid opId, CancellationToken ct)
    {
        try { return Ok(await _service.GetCostSummaryAsync(opId, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    public class DeliveryDateRequest
    {
        public DateTime? ProductionDeliveryDate { get; set; }
    }
}
