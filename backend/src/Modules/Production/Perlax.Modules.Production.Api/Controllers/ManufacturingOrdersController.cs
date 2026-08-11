using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Manufacturing;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;
using Perlax.Modules.Production.Infrastructure.Services;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/manufacturing-orders")]
public class ManufacturingOrdersController : ControllerBase
{
    private readonly ProductionDbContext _context;
    private readonly IManufacturingOrderSyncService _syncService;
    private readonly IAuditService _auditService;

    public ManufacturingOrdersController(
        ProductionDbContext context,
        IManufacturingOrderSyncService syncService,
        IAuditService auditService)
    {
        _context = context;
        _syncService = syncService;
        _auditService = auditService;
    }

    [HttpGet("pending-opening")]
    public async Task<ActionResult<IEnumerable<object>>> GetPendingOpening(CancellationToken ct)
    {
        await _syncService.EnsureApprovedOrdersSyncedAsync(ct);

        var rows = await _context.ManufacturingOrders
            .AsNoTracking()
            .Where(m => m.OpeningDate == null)
            .Where(m => _context.CustomerOrders.Any(o => o.Id == m.CustomerOrderId && o.IsApproved))
            .OrderBy(m => m.OrderNumber)
            .ThenBy(m => m.OpNumber)
            .Select(m => new
            {
                id = m.Id,
                opNumber = m.OpNumber,
                orderNumber = m.OrderNumber,
                otNumber = m.OtNumber,
                clientName = m.ClientName,
                productName = m.ProductName,
                referenceName = m.ReferenceName,
                purchaseOrderNumber = m.PurchaseOrderNumber,
                agreedDeliveryDate = m.AgreedDeliveryDate,
                quantityOrdered = m.QuantityOrdered,
                receiptPercentage = m.ReceiptPercentage,
                quantityToProduce = m.QuantityToProduce,
                approvedUnitPrice = m.ApprovedUnitPrice,
                openingDate = m.OpeningDate,
                status = m.Status
            })
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("status-board")]
    public async Task<ActionResult<IEnumerable<object>>> GetStatusBoard(
        [FromQuery] string? status,
        [FromQuery] string? q,
        CancellationToken ct)
    {
        var orders = await _context.ManufacturingOrders
            .AsNoTracking()
            .Where(m => m.OpeningDate != null)
            .OrderByDescending(m => m.OpeningDate)
            .ThenBy(m => m.OpNumber)
            .ToListAsync(ct);

        var producedMap = await LoadProducedQuantitiesByOpAsync(ct);
        var term = string.IsNullOrWhiteSpace(q) ? null : q.Trim().ToLowerInvariant();
        var statusFilter = string.IsNullOrWhiteSpace(status) ? null : status.Trim();

        var rows = orders
            .Select(mo =>
            {
                var produced = GetProducedQuantity(mo.OpNumber, producedMap);
                var progressPercent = mo.QuantityToProduce > 0
                    ? Math.Min(100m, Math.Round(produced / mo.QuantityToProduce * 100m, 1))
                    : 0m;
                var displayStatus = ResolveDisplayStatus(mo, produced);

                return new
                {
                    id = mo.Id,
                    opNumber = mo.OpNumber,
                    orderNumber = mo.OrderNumber,
                    otNumber = mo.OtNumber,
                    clientName = mo.ClientName,
                    productName = mo.ProductName,
                    referenceName = mo.ReferenceName,
                    agreedDeliveryDate = mo.AgreedDeliveryDate,
                    quantityToProduce = mo.QuantityToProduce,
                    quantityProduced = produced,
                    progressPercent,
                    displayStatus,
                    status = mo.Status,
                    openingDate = mo.OpeningDate,
                    openedBy = mo.OpenedBy
                };
            })
            .Where(row =>
            {
                if (statusFilter != null && !string.Equals(row.displayStatus, statusFilter, StringComparison.OrdinalIgnoreCase))
                    return false;

                if (term == null)
                    return true;

                return new[]
                {
                    row.opNumber,
                    row.orderNumber,
                    row.otNumber,
                    row.clientName,
                    row.productName,
                    row.referenceName,
                    row.displayStatus
                }.Any(field => (field ?? string.Empty).ToLowerInvariant().Contains(term));
            })
            .ToList();

        return Ok(rows);
    }

    [HttpGet("opened")]
    public async Task<ActionResult<IEnumerable<object>>> GetOpened(CancellationToken ct)
    {
        var rows = await _context.ManufacturingOrders
            .AsNoTracking()
            .Where(m => m.OpeningDate != null && m.Status == "Abierta")
            .OrderByDescending(m => m.OpeningDate)
            .Select(m => new
            {
                id = m.Id,
                opNumber = m.OpNumber,
                orderNumber = m.OrderNumber,
                otNumber = m.OtNumber,
                clientName = m.ClientName,
                productName = m.ProductName,
                referenceName = m.ReferenceName,
                purchaseOrderNumber = m.PurchaseOrderNumber,
                agreedDeliveryDate = m.AgreedDeliveryDate,
                quantityOrdered = m.QuantityOrdered,
                receiptPercentage = m.ReceiptPercentage,
                quantityToProduce = m.QuantityToProduce,
                approvedUnitPrice = m.ApprovedUnitPrice,
                openingDate = m.OpeningDate,
                status = m.Status
            })
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetById(Guid id, CancellationToken ct)
    {
        var mo = await _context.ManufacturingOrders
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (mo == null)
            return NotFound();

        return Ok(MapDetail(mo));
    }

    [HttpPut("{id:guid}/open")]
    public async Task<ActionResult> Open(Guid id, [FromBody] OpenManufacturingOrderRequest request, CancellationToken ct)
    {
        var mo = await _context.ManufacturingOrders
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (mo == null)
            return NotFound();

        if (mo.OpeningDate != null)
            return BadRequest(new { message = "Esta orden de produccion ya fue abierta." });

        if (request.OpeningDate == null)
            return BadRequest(new { message = "La fecha de apertura es obligatoria." });

        if (request.ReceiptPercentage is < 0 or > 100)
            return BadRequest(new { message = "El porcentaje de recibo debe estar entre 0 y 100." });

        var receiptPct = request.ReceiptPercentage ?? mo.ReceiptPercentage;
        mo.ReceiptPercentage = receiptPct;
        mo.QuantityToProduce = request.QuantityToProduce ?? ManufacturingOrderSyncService.CalculateQuantityToProduce(mo.QuantityOrdered, receiptPct);
        mo.OpeningDate = ToUtcDateTime(request.OpeningDate.Value);
        mo.Status = "Abierta";
        mo.OpenedBy = User.Identity?.Name ?? "Sistema";
        mo.UpdatedAt = DateTime.UtcNow;
        mo.UpdatedBy = mo.OpenedBy;

        await _context.SaveChangesAsync(ct);

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "OPEN_MANUFACTURING_ORDER",
            $"Se abrio OP {mo.OpNumber} ({mo.ClientName})",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return NoContent();
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> UpdatePending(Guid id, [FromBody] UpdateManufacturingOrderRequest request, CancellationToken ct)
    {
        var mo = await _context.ManufacturingOrders
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (mo == null)
            return NotFound();

        if (mo.OpeningDate != null)
            return BadRequest(new { message = "No se puede editar una OP ya abierta desde apertura." });

        if (request.ReceiptPercentage is < 0 or > 100)
            return BadRequest(new { message = "El porcentaje de recibo debe estar entre 0 y 100." });

        if (request.ReceiptPercentage.HasValue)
        {
            mo.ReceiptPercentage = request.ReceiptPercentage.Value;
            mo.QuantityToProduce = ManufacturingOrderSyncService.CalculateQuantityToProduce(mo.QuantityOrdered, mo.ReceiptPercentage);
        }

        if (request.QuantityToProduce.HasValue)
            mo.QuantityToProduce = request.QuantityToProduce.Value;

        mo.UpdatedAt = DateTime.UtcNow;
        mo.UpdatedBy = User.Identity?.Name ?? "Sistema";

        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/close")]
    public async Task<ActionResult> Close(Guid id, CancellationToken ct)
    {
        var mo = await _context.ManufacturingOrders
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (mo == null)
            return NotFound();

        if (mo.OpeningDate == null)
            return BadRequest(new { message = "Solo se pueden cerrar OP ya abiertas." });

        if (string.Equals(mo.Status, "Cerrada", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Esta orden de produccion ya esta cerrada." });

        mo.Status = "Cerrada";
        mo.UpdatedAt = DateTime.UtcNow;
        mo.UpdatedBy = User.Identity?.Name ?? "Sistema";

        await _context.SaveChangesAsync(ct);

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "CLOSE_MANUFACTURING_ORDER",
            $"Se cerro OP {mo.OpNumber} ({mo.ClientName})",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return NoContent();
    }

    private async Task<Dictionary<string, decimal>> LoadProducedQuantitiesByOpAsync(CancellationToken ct)
    {
        var activities = await _context.ProductionActivities
            .AsNoTracking()
            .Where(a => a.Status == ProductionActivityStatuses.Done && a.ProductionOrderNumber != null)
            .Select(a => new { a.ProductionOrderNumber, a.QuantityProcessed })
            .ToListAsync(ct);

        return activities
            .GroupBy(a => NormalizeOpKey(a.ProductionOrderNumber))
            .Where(g => g.Key.Length > 0)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.QuantityProcessed));
    }

    private static decimal GetProducedQuantity(string opNumber, IReadOnlyDictionary<string, decimal> producedMap)
    {
        var key = NormalizeOpKey(opNumber);
        return key.Length == 0 ? 0m : producedMap.GetValueOrDefault(key, 0m);
    }

    private static string ResolveDisplayStatus(ManufacturingOrder mo, decimal quantityProduced)
    {
        if (string.Equals(mo.Status, "Cerrada", StringComparison.OrdinalIgnoreCase))
            return "Cerrada";

        if (mo.QuantityToProduce > 0 && quantityProduced >= mo.QuantityToProduce)
            return "Terminada";

        if (quantityProduced > 0)
            return "EnProduccion";

        return "Abierta";
    }

    private static string NormalizeOpKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
    }

    private static object MapDetail(Domain.Entities.ManufacturingOrder m) => new
    {
        id = m.Id,
        opNumber = m.OpNumber,
        orderNumber = m.OrderNumber,
        otNumber = m.OtNumber,
        clientName = m.ClientName,
        productName = m.ProductName,
        referenceName = m.ReferenceName,
        purchaseOrderNumber = m.PurchaseOrderNumber,
        agreedDeliveryDate = m.AgreedDeliveryDate,
        quantityOrdered = m.QuantityOrdered,
        receiptPercentage = m.ReceiptPercentage,
        quantityToProduce = m.QuantityToProduce,
        approvedUnitPrice = m.ApprovedUnitPrice,
        openingDate = m.OpeningDate,
        status = m.Status,
        openedBy = m.OpenedBy
    };

    private static DateTime ToUtcDateTime(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime()
        };
    }

    public sealed class OpenManufacturingOrderRequest
    {
        public DateTime? OpeningDate { get; set; }
        public decimal? ReceiptPercentage { get; set; }
        public decimal? QuantityToProduce { get; set; }
    }

    public sealed class UpdateManufacturingOrderRequest
    {
        public decimal? ReceiptPercentage { get; set; }
        public decimal? QuantityToProduce { get; set; }
    }
}