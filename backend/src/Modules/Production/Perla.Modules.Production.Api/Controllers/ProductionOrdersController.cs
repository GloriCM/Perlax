using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perla.Modules.Production.Application.DTOs;
using Perla.Modules.Production.Domain.Entities;
using Perla.Modules.Production.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Perla.Modules.Production.Api.Controllers;

[Authorize]
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
    public async Task<ActionResult<IEnumerable<ProductionOrderDto>>> GetOrders()
    {
        var orders = await _context.ProductionOrders
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new ProductionOrderDto(
                o.Id,
                o.ProductCode,
                o.ProductName,
                o.PlannedQuantity,
                o.ProducedQuantity,
                o.ScheduledStart,
                o.Status,
                o.CreatedAt
            ))
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductionOrderDto>> GetOrder(Guid id)
    {
        var o = await _context.ProductionOrders.FindAsync(id);

        if (o == null) return NotFound();

        return Ok(new ProductionOrderDto(
            o.Id,
            o.ProductCode,
            o.ProductName,
            o.PlannedQuantity,
            o.ProducedQuantity,
            o.ScheduledStart,
            o.Status,
            o.CreatedAt
        ));
    }

    [HttpPost]
    public async Task<ActionResult<ProductionOrderDto>> CreateOrder([FromBody] CreateProductionOrderRequest request)
    {
        var order = new ProductionOrder
        {
            Id = Guid.NewGuid(),
            ProductCode = request.ProductCode,
            ProductName = request.ProductName,
            PlannedQuantity = request.PlannedQuantity,
            ScheduledStart = request.ScheduledStart,
            Status = "Pending"
        };

        _context.ProductionOrders.Add(order);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, new ProductionOrderDto(
            order.Id,
            order.ProductCode,
            order.ProductName,
            order.PlannedQuantity,
            order.ProducedQuantity,
            order.ScheduledStart,
            order.Status,
            order.CreatedAt
        ));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOrder(Guid id, [FromBody] UpdateProductionOrderRequest request)
    {
        var order = await _context.ProductionOrders.FindAsync(id);

        if (order == null) return NotFound();

        order.ProductName = request.ProductName;
        order.PlannedQuantity = request.PlannedQuantity;
        order.ProducedQuantity = request.ProducedQuantity;
        order.ScheduledStart = request.ScheduledStart;
        order.Status = request.Status;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(Guid id)
    {
        var order = await _context.ProductionOrders.FindAsync(id);

        if (order == null) return NotFound();

        _context.ProductionOrders.Remove(order);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
