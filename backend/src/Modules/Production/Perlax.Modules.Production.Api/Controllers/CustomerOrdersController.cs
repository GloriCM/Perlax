using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.CustomerOrders;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/customer-orders")]
public class CustomerOrdersController : ControllerBase
{
    private readonly ICustomerOrderService _orders;
    private readonly IAuditService _auditService;

    public CustomerOrdersController(ICustomerOrderService orders, IAuditService auditService)
    {
        _orders = orders;
        _auditService = auditService;
    }

    [HttpGet("available-products")]
    public async Task<ActionResult<IEnumerable<object>>> GetAvailableProducts(CancellationToken ct)
    {
        var products = await _orders.GetAvailableProductsAsync(ct);
        return Ok(products.Select(p => new
        {
            partId = p.PartId,
            otNumber = p.OtNumber,
            productName = p.ProductName,
            referenceName = p.ReferenceName,
            clientName = p.ClientName,
            approvedUnitPrice = p.ApprovedUnitPrice
        }));
    }

    [HttpGet("next-number")]
    public async Task<ActionResult<string>> GetNextNumber(CancellationToken ct) =>
        Ok(await _orders.GetNextNumberAsync(ct));

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetOrders(CancellationToken ct)
    {
        var rows = await _orders.ListAsync(ct);
        return Ok(rows.Select(x => new
        {
            id = x.Id,
            orderNumber = x.OrderNumber,
            orderDate = x.OrderDate,
            dispatchDate = x.DispatchDate,
            clientName = x.ClientName,
            purchaseOrderNumber = x.PurchaseOrderNumber,
            productName = x.ProductName,
            referenceName = x.ReferenceName,
            quantity = x.Quantity,
            approvedUnitPrice = x.ApprovedUnitPrice,
            orderPartId = x.OrderPartId,
            isApproved = x.IsApproved
        }));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var order = await _orders.GetByIdAsync(id, ct);
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
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] SaveCustomerOrderRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _orders.CreateAsync(ToCommand(request), CurrentUser(), ct);
            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "CREATE_CUSTOMER_ORDER",
                $"Se creo pedido cliente {result.OrderNumber}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                new { id = result.Id, orderNumber = result.OrderNumber });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] SaveCustomerOrderRequest request, CancellationToken ct)
    {
        try
        {
            await _orders.UpdateAsync(id, ToCommand(request), CurrentUser(), ct);
            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "UPDATE_CUSTOMER_ORDER",
                $"Se actualizo pedido cliente {id}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}/approve")]
    public async Task<ActionResult> Approve(Guid id, [FromBody] ApproveCustomerOrderRequest request, CancellationToken ct)
    {
        try
        {
            var items = (request.Items ?? new List<ApproveCustomerOrderItemRequest>())
                .Select(i => new ApproveCustomerOrderItemCommand(i.OrderPartId, i.ApprovedUnitPrice))
                .ToList();

            var detail = await _orders.GetByIdAsync(id, ct);
            await _orders.ApproveAsync(id, items, CurrentUser(), ct);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "APPROVE_CUSTOMER_ORDER",
                $"Se aprobo pedido cliente {detail.OrderNumber} ({detail.ClientName})",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private static SaveCustomerOrderCommand ToCommand(SaveCustomerOrderRequest request) => new(
        request.OrderNumber,
        request.OrderDate,
        request.ClientName,
        request.PurchaseOrderNumber,
        request.AgreedDeliveryDate,
        request.Items.Select(i => new SaveCustomerOrderItemCommand(
            i.OrderPartId, i.Quantity, i.ApprovedUnitPrice, i.ProductName, i.ReferenceName)).ToList());

    private string CurrentUser() => User.Identity?.Name ?? "Sistema";

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