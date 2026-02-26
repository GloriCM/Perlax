using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Route("api/production/orders")]
public class ProductionOrdersController : ControllerBase
{
    private readonly ProductionDbContext _context;

    public ProductionOrdersController(ProductionDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductionOrder>>> GetOrders()
    {
        return await _context.ProductionOrders.OrderByDescending(o => o.CreatedAt).ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<ProductionOrder>> CreateOrder(ProductionOrder order)
    {
        order.Id = Guid.NewGuid();
        order.CreatedAt = DateTime.UtcNow;
        _context.ProductionOrders.Add(order);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOrders), new { id = order.Id }, order);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductionOrder>> GetOrder(Guid id)
    {
        var order = await _context.ProductionOrders.FindAsync(id);

        if (order == null)
        {
            return NotFound();
        }

        return order;
    }
}
