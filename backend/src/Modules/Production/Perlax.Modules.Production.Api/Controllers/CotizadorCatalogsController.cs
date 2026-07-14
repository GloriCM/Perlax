using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize(Roles = "Administrador,Admin")]
[Route("api/production/cotizador/catalogs")]
public class CotizadorCatalogsController : ControllerBase
{
    private readonly ProductionDbContext _context;
    private readonly IAuditService _auditService;

    public CotizadorCatalogsController(ProductionDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet("machines")]
    public async Task<ActionResult<IEnumerable<CotizadorMachine>>> GetMachines() =>
        Ok(await _context.CotizadorMachines.OrderBy(x => x.ServiceRole).ThenBy(x => x.Name).ToListAsync());

    [HttpPost("machines")]
    public async Task<ActionResult<CotizadorMachine>> CreateMachine([FromBody] CotizadorMachine item)
    {
        item.Id = Guid.NewGuid();
        item.CreatedAt = DateTime.UtcNow;
        _context.CotizadorMachines.Add(item);
        await _context.SaveChangesAsync();
        await Audit("CREATE_COTIZADOR_MACHINE", item.Name);
        return Ok(item);
    }

    [HttpPut("machines/{id:guid}")]
    public async Task<ActionResult<CotizadorMachine>> UpdateMachine(Guid id, [FromBody] CotizadorMachine item)
    {
        var entity = await _context.CotizadorMachines.FindAsync(id);
        if (entity == null) return NotFound();
        entity.Name = item.Name;
        entity.ServiceRole = item.ServiceRole;
        entity.SetupTimeHours = item.SetupTimeHours;
        entity.ShotsPerHour = item.ShotsPerHour;
        entity.HourlyRate = item.HourlyRate;
        entity.IsActive = item.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await Audit("UPDATE_COTIZADOR_MACHINE", entity.Name);
        return Ok(entity);
    }

    [HttpDelete("machines/{id:guid}")]
    public async Task<IActionResult> DeleteMachine(Guid id)
    {
        var entity = await _context.CotizadorMachines.FindAsync(id);
        if (entity == null) return NotFound();
        _context.CotizadorMachines.Remove(entity);
        await _context.SaveChangesAsync();
        await Audit("DELETE_COTIZADOR_MACHINE", entity.Name);
        return NoContent();
    }

    [HttpPost("machines/import")]
    public async Task<ActionResult<object>> ImportMachinesPlaceholder()
    {
        return Ok(new { message = "Importación Excel pendiente. Envíe la plantilla para habilitar este endpoint." });
    }

    [HttpGet("materials")]
    public async Task<ActionResult<IEnumerable<CotizadorMaterial>>> GetMaterials() =>
        Ok(await _context.CotizadorMaterials.OrderBy(x => x.Name).ToListAsync());

    [HttpPost("materials")]
    public async Task<ActionResult<CotizadorMaterial>> CreateMaterial([FromBody] CotizadorMaterial item)
    {
        item.Id = Guid.NewGuid();
        item.CreatedAt = DateTime.UtcNow;
        _context.CotizadorMaterials.Add(item);
        await _context.SaveChangesAsync();
        await Audit("CREATE_COTIZADOR_MATERIAL", item.Name);
        return Ok(item);
    }

    [HttpPut("materials/{id:guid}")]
    public async Task<ActionResult<CotizadorMaterial>> UpdateMaterial(Guid id, [FromBody] CotizadorMaterial item)
    {
        var entity = await _context.CotizadorMaterials.FindAsync(id);
        if (entity == null) return NotFound();
        entity.Name = item.Name;
        entity.PricePerM2 = item.PricePerM2;
        entity.IsActive = item.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("materials/{id:guid}")]
    public async Task<IActionResult> DeleteMaterial(Guid id)
    {
        var entity = await _context.CotizadorMaterials.FindAsync(id);
        if (entity == null) return NotFound();
        _context.CotizadorMaterials.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("factors")]
    public async Task<ActionResult<IEnumerable<CotizadorFactor>>> GetFactors() =>
        Ok(await _context.CotizadorFactors.OrderBy(x => x.Key).ToListAsync());

    [HttpPut("factors/{id:guid}")]
    public async Task<ActionResult<CotizadorFactor>> UpdateFactor(Guid id, [FromBody] CotizadorFactor item)
    {
        var entity = await _context.CotizadorFactors.FindAsync(id);
        if (entity == null) return NotFound();
        entity.Value = item.Value;
        entity.Label = string.IsNullOrWhiteSpace(item.Label) ? entity.Label : item.Label;
        entity.Description = item.Description;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await Audit("UPDATE_COTIZADOR_FACTOR", entity.Key);
        return Ok(entity);
    }

    [HttpPost("factors")]
    public async Task<ActionResult<CotizadorFactor>> CreateFactor([FromBody] CotizadorFactor item)
    {
        if (string.IsNullOrWhiteSpace(item.Key))
            return BadRequest(new { message = "El nombre del factor es obligatorio." });

        var key = item.Key.Trim();
        if (await _context.CotizadorFactors.AnyAsync(f => f.Key == key))
            return Conflict(new { message = $"Ya existe un factor con nombre '{key}'." });

        var entity = new CotizadorFactor
        {
            Id = Guid.NewGuid(),
            Key = key,
            Label = string.IsNullOrWhiteSpace(item.Label) ? key : item.Label.Trim(),
            Value = item.Value,
            Description = item.Description,
            CreatedAt = DateTime.UtcNow
        };

        _context.CotizadorFactors.Add(entity);
        await _context.SaveChangesAsync();
        await Audit("CREATE_COTIZADOR_FACTOR", entity.Key);
        return Ok(entity);
    }

    [HttpGet("micro-flauta")]
    public async Task<ActionResult<IEnumerable<CotizadorMicroFlauta>>> GetMicroFlauta() =>
        Ok(await _context.CotizadorMicroFlautas.OrderBy(x => x.Name).ToListAsync());

    [HttpPost("micro-flauta")]
    public async Task<ActionResult<CotizadorMicroFlauta>> CreateMicroFlauta([FromBody] CotizadorMicroFlauta item)
    {
        item.Id = Guid.NewGuid();
        item.CreatedAt = DateTime.UtcNow;
        _context.CotizadorMicroFlautas.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("micro-flauta/{id:guid}")]
    public async Task<ActionResult<CotizadorMicroFlauta>> UpdateMicroFlauta(Guid id, [FromBody] CotizadorMicroFlauta item)
    {
        var entity = await _context.CotizadorMicroFlautas.FindAsync(id);
        if (entity == null) return NotFound();
        entity.Name = item.Name;
        entity.PricePerM2 = item.PricePerM2;
        entity.IsActive = item.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("micro-flauta/{id:guid}")]
    public async Task<IActionResult> DeleteMicroFlauta(Guid id)
    {
        var entity = await _context.CotizadorMicroFlautas.FindAsync(id);
        if (entity == null) return NotFound();
        _context.CotizadorMicroFlautas.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("planchas")]
    public async Task<ActionResult<IEnumerable<CotizadorPlancha>>> GetPlanchas() =>
        Ok(await _context.CotizadorPlanchas.OrderBy(x => x.Name).ToListAsync());

    [HttpPost("planchas")]
    public async Task<ActionResult<CotizadorPlancha>> CreatePlancha([FromBody] CotizadorPlancha item)
    {
        item.Id = Guid.NewGuid();
        item.CreatedAt = DateTime.UtcNow;
        _context.CotizadorPlanchas.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("planchas/{id:guid}")]
    public async Task<ActionResult<CotizadorPlancha>> UpdatePlancha(Guid id, [FromBody] CotizadorPlancha item)
    {
        var entity = await _context.CotizadorPlanchas.FindAsync(id);
        if (entity == null) return NotFound();
        entity.Name = item.Name;
        entity.Price = item.Price;
        entity.IsActive = item.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("planchas/{id:guid}")]
    public async Task<IActionResult> DeletePlancha(Guid id)
    {
        var entity = await _context.CotizadorPlanchas.FindAsync(id);
        if (entity == null) return NotFound();
        _context.CotizadorPlanchas.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private Task Audit(string action, string detail) =>
        _auditService.LogAsync(User.Identity?.Name, User.Identity?.Name, action, detail,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
}
