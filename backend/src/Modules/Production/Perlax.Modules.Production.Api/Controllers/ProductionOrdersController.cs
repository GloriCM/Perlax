using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Common;
using Perlax.Modules.Production.Application.Orders;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/orders")]
public class ProductionOrdersController : ControllerBase
{
    private readonly IProductionOrderService _orders;
    private readonly IAuditService _auditService;
    private readonly IWebHostEnvironment _environment;

    public ProductionOrdersController(
        IProductionOrderService orders,
        IAuditService auditService,
        IWebHostEnvironment environment)
    {
        _orders = orders;
        _auditService = auditService;
        _environment = environment;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductionOrder>>> GetOrders(CancellationToken ct) =>
        Ok(await _orders.ListAsync(ct));

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductionOrder>> GetOrder(Guid id, CancellationToken ct)
    {
        try { return await _orders.GetByIdAsync(id, ct); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost]
    public async Task<ActionResult<ProductionOrder>> CreateOrder(ProductionOrder order, CancellationToken ct)
    {
        try
        {
            var created = await _orders.CreateAsync(order, CurrentUser(), ct);
            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "CREATE_OT",
                $"Se creo la OT {created.OTNumber} para el cliente {created.Cliente}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return CreatedAtAction(nameof(GetOrder), new { id = created.Id }, created);
        }
        catch (ResourceConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProductionOrder>> UpdateOrder(Guid id, [FromBody] ProductionOrder request, CancellationToken ct)
    {
        try
        {
            var order = await _orders.UpdateAsync(id, request, CurrentUser(), ct);
            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "UPDATE_OT",
                $"Se actualizo la OT {order.OTNumber} del cliente {order.Cliente}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(order);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("check-duplicate")]
    public async Task<ActionResult<bool>> CheckDuplicate(string cliente, string productName, CancellationToken ct)
    {
        try { return await _orders.ExistsDuplicateAsync(cliente, productName, ct); }
        catch (InvalidOperationException) { return BadRequest(); }
    }

    [HttpGet("reusable")]
    public async Task<ActionResult<IEnumerable<object>>> SearchReusable([FromQuery] string? q, [FromQuery] int limit = 30, CancellationToken ct = default)
    {
        var rows = await _orders.SearchReusableAsync(q, limit, ct);
        return Ok(rows.Select(o => new
        {
            id = o.Id,
            otNumber = o.OtNumber,
            cliente = o.Cliente,
            productName = o.ProductName,
            asignacion = o.Asignacion,
            partsCount = o.PartsCount,
            hasApprovedFicha = o.HasApprovedFicha,
            lastOpNumber = o.LastOpNumber,
            createdAt = o.CreatedAt,
        }));
    }

    [HttpGet("{id:guid}/clone-template")]
    public async Task<ActionResult<object>> GetCloneTemplate(Guid id, CancellationToken ct)
    {
        try
        {
            var tpl = await _orders.GetCloneTemplateAsync(id, ct);
            return Ok(new
            {
                sourceOrderId = tpl.SourceOrderId,
                sourceOtNumber = tpl.SourceOtNumber,
                lastOpNumber = tpl.LastOpNumber,
                draft = tpl.Draft,
            });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "OT origen no encontrada." }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("designs-by-client")]
    public async Task<ActionResult<IEnumerable<object>>> GetDesignsByClient(string cliente, CancellationToken ct)
    {
        var rows = await _orders.GetDesignsByClientAsync(cliente, ct);
        return Ok(rows.Select(o => new { otNumber = o.OtNumber, productName = o.ProductName, createdAt = o.CreatedAt }));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(Guid id, CancellationToken ct)
    {
        try
        {
            var order = await _orders.GetByIdAsync(id, ct);
            await _orders.DeleteAsync(id, ct);
            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "DELETE_OT",
                $"Se elimino la OT {order.OTNumber} del cliente {order.Cliente}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("next-number")]
    public async Task<ActionResult<string>> GetNextNumber(CancellationToken ct) =>
        await _orders.GetNextNumberAsync(ct);

    [HttpGet("clients-suggestions")]
    public async Task<ActionResult<IEnumerable<string>>> GetClientSuggestions(
        [FromQuery] string? q = null,
        [FromQuery] int limit = 30,
        CancellationToken ct = default) =>
        Ok(await _orders.GetClientSuggestionsAsync(q, limit, ct));

    [HttpPost("{orderId:guid}/attachments")]
    [RequestSizeLimit(104_857_600)]
    [RequestFormLimits(MultipartBodyLengthLimit = 104_857_600)]
    public async Task<IActionResult> UploadAttachments(
        Guid orderId,
        [FromForm] string category,
        [FromForm] Guid partId,
        CancellationToken cancellationToken)
    {
        try
        {
            var files = Request.Form.Files
                .Select(f => new OtUploadFileDto(f.FileName, f.ContentType, f.Length, f.OpenReadStream()))
                .ToList();

            var result = await _orders.UploadAttachmentsAsync(
                orderId, partId, category, GetUploadsRoot(), files, CurrentUser(), cancellationToken);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "OT_ATTACHMENTS",
                $"Se agregaron {result.AddedCount} adjunto(s) {category} a OT / pieza {partId}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(new
            {
                added = result.AddedCount,
                files = result.Files.Select(a => new
                {
                    kind = a.Kind,
                    category = a.Category,
                    storedFileName = a.StoredFileName,
                    originalFileName = a.OriginalFileName,
                    relativePath = a.RelativePath,
                    publicUrl = a.PublicUrl,
                    contentType = a.ContentType,
                    sizeBytes = a.SizeBytes,
                    uploadedAtUtc = a.UploadedAtUtc
                })
            });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{orderId:guid}/attachments")]
    public async Task<IActionResult> DeleteAttachment(
        Guid orderId,
        [FromBody] DeleteAttachmentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await _orders.GetByIdAsync(orderId, cancellationToken);
            await _orders.DeleteAttachmentAsync(
                orderId, request.PartId, request.PublicUrl, GetUploadsRoot(), CurrentUser(), cancellationToken);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "OT_ATTACHMENT_DELETE",
                $"Se elimino adjunto de OT {order.OTNumber} / pieza {request.PartId}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(new { deleted = true, publicUrl = request.PublicUrl });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{orderId:guid}/parts/{partId:guid}/design-plan")]
    public async Task<IActionResult> UpdatePartDesignPlan(
        Guid orderId,
        Guid partId,
        [FromBody] UpdatePartDesignPlanRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _orders.UpdatePartDesignPlanAsync(
                orderId,
                partId,
                new UpdatePartDesignPlanCommand(request.Prioridad, request.Disenador),
                CurrentUser(),
                cancellationToken);

            var order = await _orders.GetByIdAsync(orderId, cancellationToken);
            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "UPDATE_OT_DESIGN_PLAN",
                $"Se actualizo prioridad/disenador en OT {order.OTNumber} / pieza {partId}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(new { id = result.Id, prioridad = result.Prioridad, disenador = result.Disenador });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private string GetUploadsRoot()
    {
        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
        return Path.Combine(webRoot, "uploads");
    }

    private string CurrentUser() => User.Identity?.Name ?? "Sistema";

    public sealed class UpdatePartDesignPlanRequest
    {
        public string? Prioridad { get; set; }
        public string? Disenador { get; set; }
    }

    public sealed class DeleteAttachmentRequest
    {
        public Guid PartId { get; set; }
        public string PublicUrl { get; set; } = string.Empty;
    }
}