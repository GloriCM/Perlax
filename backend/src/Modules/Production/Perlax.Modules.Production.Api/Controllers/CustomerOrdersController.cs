using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/customer-orders")]
public class CustomerOrdersController : ControllerBase
{
    private readonly ProductionDbContext _context;
    private readonly IAuditService _auditService;

    public CustomerOrdersController(ProductionDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet("available-products")]
    public async Task<ActionResult<IEnumerable<object>>> GetAvailableProducts()
    {
        var products = await _context.OrderParts
            .AsNoTracking()
            .Include(p => p.Order)
            .Where(p => p.IsTechnicalSheetApproved && p.Order != null)
            .OrderByDescending(p => p.Order!.CreatedAt)
            .Select(p => new
            {
                partId = p.Id,
                otNumber = p.Order!.OTNumber,
                productName = p.Order.ProductName,
                referenceName = p.PartName,
                clientName = p.Order.Cliente,
                approvedUnitPrice = 0m
            })
            .ToListAsync();

        return Ok(products);
    }

    [HttpGet("next-number")]
    public async Task<ActionResult<string>> GetNextNumber()
    {
        var numbers = await _context.CustomerOrders
            .AsNoTracking()
            .Select(x => x.OrderNumber)
            .ToListAsync();

        var maxNumber = 0;
        foreach (var value in numbers)
        {
            if (int.TryParse(value, out var parsed) && parsed > maxNumber)
                maxNumber = parsed;
        }

        return Ok((maxNumber + 1).ToString());
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetOrders()
    {
        var rows = await _context.CustomerOrders
            .AsNoTracking()
            .Include(x => x.Items)
            .OrderByDescending(x => x.CreatedAt)
            .SelectMany(x => x.Items.Select(i => new
            {
                id = x.Id,
                orderNumber = x.OrderNumber,
                orderDate = x.OrderDate,
                dispatchDate = x.AgreedDeliveryDate,
                clientName = x.ClientName,
                purchaseOrderNumber = x.PurchaseOrderNumber,
                productName = i.ProductName,
                referenceName = i.ReferenceName,
                quantity = i.Quantity,
                approvedUnitPrice = i.ApprovedUnitPrice,
                orderPartId = i.OrderPartId,
                isApproved = x.IsApproved
            }))
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetById(Guid id)
    {
        var order = await _context.CustomerOrders
            .AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (order == null) return NotFound();

        return Ok(new
        {
            id = order.Id,
            orderNumber = order.OrderNumber,
            orderDate = order.OrderDate,
            clientName = order.ClientName,
            purchaseOrderNumber = order.PurchaseOrderNumber,
            agreedDeliveryDate = order.AgreedDeliveryDate,
            isApproved = order.IsApproved,
            items = order.Items.Select(i => new
            {
                orderPartId = i.OrderPartId,
                quantity = i.Quantity,
                approvedUnitPrice = i.ApprovedUnitPrice,
                productName = i.ProductName,
                referenceName = i.ReferenceName
            })
        });
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] SaveCustomerOrderRequest request)
    {
        var validation = await ValidateRequestAsync(request);
        if (validation is not null) return validation;

        var entity = new CustomerOrder
        {
            Id = Guid.NewGuid(),
            OrderNumber = string.IsNullOrWhiteSpace(request.OrderNumber)
                ? await GetNextNumberValueAsync()
                : request.OrderNumber.Trim(),
            OrderDate = ToUtcDateTime(request.OrderDate),
            ClientName = request.ClientName.Trim(),
            PurchaseOrderNumber = request.PurchaseOrderNumber.Trim(),
            AgreedDeliveryDate = ToUtcDateTime(request.AgreedDeliveryDate),
            IsApproved = false,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = User.Identity?.Name ?? "Sistema",
            Items = request.Items.Select(MapItem).ToList()
        };

        _context.CustomerOrders.Add(entity);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "CREATE_CUSTOMER_ORDER",
            $"Se creó pedido cliente {entity.OrderNumber} ({entity.ClientName})",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new { id = entity.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] SaveCustomerOrderRequest request)
    {
        var validation = await ValidateRequestAsync(request);
        if (validation is not null) return validation;

        var entity = await _context.CustomerOrders
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (entity == null) return NotFound();

        entity.OrderDate = ToUtcDateTime(request.OrderDate);
        entity.ClientName = request.ClientName.Trim();
        entity.PurchaseOrderNumber = request.PurchaseOrderNumber.Trim();
        entity.AgreedDeliveryDate = ToUtcDateTime(request.AgreedDeliveryDate);
        entity.IsApproved = false;
        entity.ApprovedAt = null;
        entity.ApprovedBy = null;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = User.Identity?.Name ?? "Sistema";

        _context.CustomerOrderItems.RemoveRange(entity.Items);
        entity.Items = request.Items.Select(MapItem).ToList();

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "UPDATE_CUSTOMER_ORDER",
            $"Se actualizó pedido cliente {entity.OrderNumber} ({entity.ClientName})",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return NoContent();
    }

    [HttpPut("{id:guid}/approve")]
    public async Task<ActionResult> Approve(Guid id, [FromBody] ApproveCustomerOrderRequest request)
    {
        var entity = await _context.CustomerOrders
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (entity == null) return NotFound();
        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { message = "Debe enviar items para aprobar." });

        foreach (var row in request.Items)
        {
            var item = entity.Items.FirstOrDefault(x => x.OrderPartId == row.OrderPartId);
            if (item == null) continue;
            if (row.ApprovedUnitPrice < 0)
                return BadRequest(new { message = "El PV unitario no puede ser negativo." });
            item.ApprovedUnitPrice = row.ApprovedUnitPrice;
        }

        entity.IsApproved = true;
        entity.ApprovedAt = DateTime.UtcNow;
        entity.ApprovedBy = User.Identity?.Name ?? "Sistema";
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = User.Identity?.Name ?? "Sistema";

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "APPROVE_CUSTOMER_ORDER",
            $"Se aprobó pedido cliente {entity.OrderNumber} ({entity.ClientName})",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return NoContent();
    }

    private async Task<ActionResult?> ValidateRequestAsync(SaveCustomerOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ClientName))
            return BadRequest(new { message = "CLIENTE es obligatorio." });
        if (string.IsNullOrWhiteSpace(request.PurchaseOrderNumber))
            return BadRequest(new { message = "ORDEN DE COMPRA es obligatoria." });
        if (request.AgreedDeliveryDate is null)
            return BadRequest(new { message = "FECHA PACTADA DE ENTREGA es obligatoria." });
        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { message = "Debe agregar al menos un item." });

        var partIds = request.Items.Select(x => x.OrderPartId).Distinct().ToList();
        var approvedParts = await _context.OrderParts
            .AsNoTracking()
            .Include(x => x.Order)
            .Where(x => partIds.Contains(x.Id) && x.IsTechnicalSheetApproved && x.Order != null)
            .Select(x => x.Id)
            .ToListAsync();

        if (approvedParts.Count != partIds.Count)
            return BadRequest(new { message = "Todos los productos deben estar aprobados en ficha técnica." });

        if (request.Items.Any(x => x.Quantity <= 0))
            return BadRequest(new { message = "La cantidad debe ser mayor a cero." });
        if (request.Items.Any(x => x.ApprovedUnitPrice < 0))
            return BadRequest(new { message = "PV unitario no puede ser negativo." });

        return null;
    }

    private static CustomerOrderItem MapItem(SaveCustomerOrderItemRequest request)
    {
        return new CustomerOrderItem
        {
            Id = Guid.NewGuid(),
            OrderPartId = request.OrderPartId,
            Quantity = request.Quantity,
            ApprovedUnitPrice = request.ApprovedUnitPrice,
            ProductName = request.ProductName?.Trim() ?? string.Empty,
            ReferenceName = request.ReferenceName?.Trim() ?? string.Empty
        };
    }

    private static DateTime ToUtcDateTime(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime()
        };
    }

    private static DateTime? ToUtcDateTime(DateTime? value)
    {
        return value.HasValue ? ToUtcDateTime(value.Value) : null;
    }

    private async Task<string> GetNextNumberValueAsync()
    {
        var numbers = await _context.CustomerOrders
            .AsNoTracking()
            .Select(x => x.OrderNumber)
            .ToListAsync();

        var maxNumber = 0;
        foreach (var value in numbers)
        {
            if (int.TryParse(value, out var parsed) && parsed > maxNumber)
                maxNumber = parsed;
        }

        return (maxNumber + 1).ToString();
    }

    public sealed class SaveCustomerOrderRequest
    {
        public string? OrderNumber { get; set; }
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        public string ClientName { get; set; } = string.Empty;
        public string PurchaseOrderNumber { get; set; } = string.Empty;
        public DateTime? AgreedDeliveryDate { get; set; }
        public List<SaveCustomerOrderItemRequest> Items { get; set; } = new();
    }

    public sealed class SaveCustomerOrderItemRequest
    {
        public Guid OrderPartId { get; set; }
        public decimal Quantity { get; set; }
        public decimal ApprovedUnitPrice { get; set; }
        public string? ProductName { get; set; }
        public string? ReferenceName { get; set; }
    }

    public sealed class ApproveCustomerOrderRequest
    {
        public List<ApproveCustomerOrderItemRequest> Items { get; set; } = new();
    }

    public sealed class ApproveCustomerOrderItemRequest
    {
        public Guid OrderPartId { get; set; }
        public decimal ApprovedUnitPrice { get; set; }
    }
}
