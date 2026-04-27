using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;
using Perlax.Modules.Audit.Application.Abstractions;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/orders")]
public class ProductionOrdersController : ControllerBase
{
    private readonly ProductionDbContext _context;
    private readonly IAuditService _auditService;

    public ProductionOrdersController(ProductionDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductionOrder>>> GetOrders()
    {
        return await _context.ProductionOrders
            .Include(o => o.Parts)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductionOrder>> GetOrder(Guid id)
    {
        var order = await _context.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
        {
            return NotFound();
        }

        return order;
    }

    [HttpPost]
    public async Task<ActionResult<ProductionOrder>> CreateOrder(ProductionOrder order)
    {
        // Check for duplicates before saving
        var isDuplicate = await _context.ProductionOrders.AnyAsync(o => 
            o.Cliente.ToLower() == order.Cliente.ToLower() && 
            o.ProductName.ToLower() == order.ProductName.ToLower());

        if (isDuplicate)
        {
            return Conflict(new { message = "Ya existe una orden de trabajo con el mismo cliente y nombre de producto." });
        }

        order.Id = Guid.NewGuid();
        order.CreatedAt = DateTime.UtcNow;
        order.CreatedBy = User.Identity?.Name ?? "Sistema";
        
        // Ensure parts have IDs
        foreach (var part in order.Parts)
        {
            part.Id = Guid.NewGuid();
            part.ProductionOrderId = order.Id;
        }

        _context.ProductionOrders.Add(order);
        await _context.SaveChangesAsync();

        // Audit Logging
        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name, 
            "CREATE_OT",
            $"Se creó la OT {order.OTNumber} para el cliente {order.Cliente}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"
        );

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    [HttpGet("check-duplicate")]
    public async Task<ActionResult<bool>> CheckDuplicate(string cliente, string productName)
    {
        if (string.IsNullOrWhiteSpace(cliente) || string.IsNullOrWhiteSpace(productName))
            return BadRequest();

        var exists = await _context.ProductionOrders.AnyAsync(o => 
            o.Cliente.ToLower() == cliente.ToLower() && 
            o.ProductName.ToLower() == productName.ToLower());

        return exists;
    }

    [HttpGet("designs-by-client")]
    public async Task<ActionResult<IEnumerable<object>>> GetDesignsByClient(string cliente)
    {
        return await _context.ProductionOrders
            .Where(o => o.Cliente.ToLower().Contains(cliente.ToLower()))
            .Select(o => new { o.OTNumber, o.ProductName, o.CreatedAt })
            .ToListAsync();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(Guid id)
    {
        var order = await _context.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
        {
            return NotFound();
        }

        var otNumber = order.OTNumber;
        var cliente = order.Cliente;

        _context.ProductionOrders.Remove(order);
        await _context.SaveChangesAsync();

        // Audit Logging
        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "DELETE_OT",
            $"Se eliminó la OT {otNumber} del cliente {cliente}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"
        );

        return NoContent();
    }

    [HttpGet("next-number")]
    public async Task<ActionResult<string>> GetNextNumber()
    {
        var numbers = await _context.ProductionOrders
            .Select(o => o.OTNumber)
            .ToListAsync();

        var maxNumber = 0;
        foreach (var numStr in numbers)
        {
            if (int.TryParse(numStr, out int val))
            {
                if (val > maxNumber) maxNumber = val;
            }
        }

        return (maxNumber + 1).ToString();
    }
}
