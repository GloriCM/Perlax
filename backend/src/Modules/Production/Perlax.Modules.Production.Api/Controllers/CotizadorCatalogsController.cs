using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Common;
using Perlax.Modules.Production.Application.Cotizador;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize(Roles = "Administrador,Admin")]
[Route("api/production/cotizador/catalogs")]
public class CotizadorCatalogsController : ControllerBase
{
    private readonly ICotizadorService _cotizador;
    private readonly IAuditService _auditService;

    public CotizadorCatalogsController(ICotizadorService cotizador, IAuditService auditService)
    {
        _cotizador = cotizador;
        _auditService = auditService;
    }

    [HttpGet("machines")]
    public async Task<ActionResult<IEnumerable<CotizadorMachine>>> GetMachines(CancellationToken ct) =>
        Ok(await _cotizador.GetCatalogMachinesAsync(ct));

    [HttpPost("machines")]
    public async Task<ActionResult<CotizadorMachine>> CreateMachine([FromBody] CotizadorMachine item, CancellationToken ct)
    {
        var created = await _cotizador.CreateMachineAsync(item, ct);
        await Audit("CREATE_COTIZADOR_MACHINE", created.Name);
        return Ok(created);
    }

    [HttpPut("machines/{id:guid}")]
    public async Task<ActionResult<CotizadorMachine>> UpdateMachine(Guid id, [FromBody] CotizadorMachine item, CancellationToken ct)
    {
        try
        {
            var updated = await _cotizador.UpdateMachineAsync(id, item, ct);
            await Audit("UPDATE_COTIZADOR_MACHINE", updated.Name);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("machines/{id:guid}")]
    public async Task<IActionResult> DeleteMachine(Guid id, CancellationToken ct)
    {
        try
        {
            var existing = (await _cotizador.GetCatalogMachinesAsync(ct)).FirstOrDefault(x => x.Id == id);
            await _cotizador.DeleteMachineAsync(id, ct);
            if (existing != null) await Audit("DELETE_COTIZADOR_MACHINE", existing.Name);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("machines/import")]
    public async Task<ActionResult<object>> ImportMachines([FromBody] List<CotizadorMachineImportItem>? items, CancellationToken ct)
    {
        var created = await _cotizador.ImportMachinesAsync(items ?? [], ct);
        await Audit("IMPORT_COTIZADOR_MACHINES", $"created={created}");
        return Ok(new { created, total = items?.Count ?? 0 });
    }

    [HttpGet("materials")]
    public async Task<ActionResult<IEnumerable<CotizadorMaterial>>> GetMaterials(CancellationToken ct) =>
        Ok(await _cotizador.GetCatalogMaterialsAsync(ct));

    [HttpPost("materials")]
    public async Task<ActionResult<CotizadorMaterial>> CreateMaterial([FromBody] CotizadorMaterial item, CancellationToken ct) =>
        Ok(await _cotizador.CreateMaterialAsync(item, ct));

    [HttpPut("materials/{id:guid}")]
    public async Task<ActionResult<CotizadorMaterial>> UpdateMaterial(Guid id, [FromBody] CotizadorMaterial item, CancellationToken ct)
    {
        try { return Ok(await _cotizador.UpdateMaterialAsync(id, item, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("materials/{id:guid}")]
    public async Task<IActionResult> DeleteMaterial(Guid id, CancellationToken ct)
    {
        try { await _cotizador.DeleteMaterialAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("factors")]
    public async Task<ActionResult<IEnumerable<CotizadorFactor>>> GetFactors(CancellationToken ct) =>
        Ok(await _cotizador.GetFactorsAsync(ct));

    [HttpPut("factors/{id:guid}")]
    public async Task<ActionResult<CotizadorFactor>> UpdateFactor(Guid id, [FromBody] CotizadorFactor item, CancellationToken ct)
    {
        try
        {
            var updated = await _cotizador.UpdateFactorAsync(id, item, ct);
            await Audit("UPDATE_COTIZADOR_FACTOR", updated.Key);
            return Ok(updated);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("factors")]
    public async Task<ActionResult<CotizadorFactor>> CreateFactor([FromBody] CotizadorFactor item, CancellationToken ct)
    {
        try
        {
            var created = await _cotizador.CreateFactorAsync(item, ct);
            await Audit("CREATE_COTIZADOR_FACTOR", created.Key);
            return Ok(created);
        }
        catch (ResourceConflictException ex) { return Conflict(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("micro-flauta")]
    public async Task<ActionResult<IEnumerable<CotizadorMicroFlauta>>> GetMicroFlauta(CancellationToken ct) =>
        Ok(await _cotizador.GetCatalogMicroFlautasAsync(ct));

    [HttpPost("micro-flauta")]
    public async Task<ActionResult<CotizadorMicroFlauta>> CreateMicroFlauta([FromBody] CotizadorMicroFlauta item, CancellationToken ct) =>
        Ok(await _cotizador.CreateMicroFlautaAsync(item, ct));

    [HttpPut("micro-flauta/{id:guid}")]
    public async Task<ActionResult<CotizadorMicroFlauta>> UpdateMicroFlauta(Guid id, [FromBody] CotizadorMicroFlauta item, CancellationToken ct)
    {
        try { return Ok(await _cotizador.UpdateMicroFlautaAsync(id, item, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("micro-flauta/{id:guid}")]
    public async Task<IActionResult> DeleteMicroFlauta(Guid id, CancellationToken ct)
    {
        try { await _cotizador.DeleteMicroFlautaAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("planchas")]
    public async Task<ActionResult<IEnumerable<CotizadorPlancha>>> GetPlanchas(CancellationToken ct) =>
        Ok(await _cotizador.GetCatalogPlanchasAsync(ct));

    [HttpPost("planchas")]
    public async Task<ActionResult<CotizadorPlancha>> CreatePlancha([FromBody] CotizadorPlancha item, CancellationToken ct) =>
        Ok(await _cotizador.CreatePlanchaAsync(item, ct));

    [HttpPut("planchas/{id:guid}")]
    public async Task<ActionResult<CotizadorPlancha>> UpdatePlancha(Guid id, [FromBody] CotizadorPlancha item, CancellationToken ct)
    {
        try { return Ok(await _cotizador.UpdatePlanchaAsync(id, item, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("planchas/{id:guid}")]
    public async Task<IActionResult> DeletePlancha(Guid id, CancellationToken ct)
    {
        try { await _cotizador.DeletePlanchaAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("barnices")]
    public async Task<ActionResult<IEnumerable<CotizadorBarniz>>> GetBarnices(CancellationToken ct) =>
        Ok(await _cotizador.GetCatalogBarnicesAsync(ct));

    [HttpPost("barnices")]
    public async Task<ActionResult<CotizadorBarniz>> CreateBarniz([FromBody] CotizadorBarniz item, CancellationToken ct) =>
        Ok(await _cotizador.CreateBarnizAsync(item, ct));

    [HttpPut("barnices/{id:guid}")]
    public async Task<ActionResult<CotizadorBarniz>> UpdateBarniz(Guid id, [FromBody] CotizadorBarniz item, CancellationToken ct)
    {
        try { return Ok(await _cotizador.UpdateBarnizAsync(id, item, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("barnices/{id:guid}")]
    public async Task<IActionResult> DeleteBarniz(Guid id, CancellationToken ct)
    {
        try { await _cotizador.DeleteBarnizAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("terminados")]
    public async Task<ActionResult<IEnumerable<CotizadorTerminado>>> GetTerminados(CancellationToken ct) =>
        Ok(await _cotizador.GetCatalogTerminadosAsync(ct));

    [HttpPost("terminados")]
    public async Task<ActionResult<CotizadorTerminado>> CreateTerminado([FromBody] CotizadorTerminado item, CancellationToken ct) =>
        Ok(await _cotizador.CreateTerminadoAsync(item, ct));

    [HttpPut("terminados/{id:guid}")]
    public async Task<ActionResult<CotizadorTerminado>> UpdateTerminado(Guid id, [FromBody] CotizadorTerminado item, CancellationToken ct)
    {
        try { return Ok(await _cotizador.UpdateTerminadoAsync(id, item, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("terminados/{id:guid}")]
    public async Task<IActionResult> DeleteTerminado(Guid id, CancellationToken ct)
    {
        try { await _cotizador.DeleteTerminadoAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("cordones")]
    public async Task<ActionResult<IEnumerable<CotizadorCordon>>> GetCordones(CancellationToken ct) =>
        Ok(await _cotizador.GetCatalogCordonesAsync(ct));

    [HttpPost("cordones")]
    public async Task<ActionResult<CotizadorCordon>> CreateCordon([FromBody] CotizadorCordon item, CancellationToken ct) =>
        Ok(await _cotizador.CreateCordonAsync(item, ct));

    [HttpPut("cordones/{id:guid}")]
    public async Task<ActionResult<CotizadorCordon>> UpdateCordon(Guid id, [FromBody] CotizadorCordon item, CancellationToken ct)
    {
        try { return Ok(await _cotizador.UpdateCordonAsync(id, item, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("cordones/{id:guid}")]
    public async Task<IActionResult> DeleteCordon(Guid id, CancellationToken ct)
    {
        try { await _cotizador.DeleteCordonAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("materials/import")]
    public async Task<ActionResult<object>> ImportMaterials([FromBody] List<CotizadorMaterialImportItem>? items, CancellationToken ct)
    {
        var created = await _cotizador.ImportMaterialsAsync(items ?? [], ct);
        await Audit("IMPORT_COTIZADOR_MATERIALS", $"created={created}");
        return Ok(new { created, total = items?.Count ?? 0 });
    }

    private Task Audit(string action, string detail) =>
        _auditService.LogAsync(User.Identity?.Name, User.Identity?.Name, action, detail,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
}