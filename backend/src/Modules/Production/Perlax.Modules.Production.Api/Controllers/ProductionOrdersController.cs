using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
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
    private static readonly JsonSerializerOptions JsonAttachOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".ppt", ".pptx", ".odt", ".ods",
    };

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff",
    };

    private const long MaxFileBytes = 26_214_400; // 25 MB por archivo

    private readonly ProductionDbContext _context;
    private readonly IAuditService _auditService;
    private readonly IWebHostEnvironment _environment;

    public ProductionOrdersController(
        ProductionDbContext context,
        IAuditService auditService,
        IWebHostEnvironment environment)
    {
        _context = context;
        _auditService = auditService;
        _environment = environment;
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

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProductionOrder>> UpdateOrder(Guid id, [FromBody] ProductionOrder request)
    {
        var order = await _context.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound();

        order.OTNumber = request.OTNumber;
        order.Cliente = request.Cliente;
        order.EjecutivoCuenta = request.EjecutivoCuenta;
        order.FechaSolicitud = request.FechaSolicitud;
        order.Asignacion = request.Asignacion;
        order.LineaPT = request.LineaPT;
        order.NumeroPartes = request.NumeroPartes;
        order.ProductCode = request.ProductCode;
        order.ProductName = request.ProductName;
        order.Status = "Pendiente";
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = User.Identity?.Name ?? "Sistema";

        var existingPartsById = order.Parts.ToDictionary(p => p.Id, p => p);
        var keepPartIds = new HashSet<Guid>();

        foreach (var incoming in request.Parts)
        {
            if (incoming.Id != Guid.Empty && existingPartsById.TryGetValue(incoming.Id, out var existing))
            {
                _context.Entry(existing).CurrentValues.SetValues(incoming);
                existing.ProductionOrderId = id;
                existing.EstadoAprobacion = "Pendiente";
                existing.EstadoFicha = "Pendiente";
                existing.IsTechnicalSheetApproved = false;
                existing.TechnicalSheetApprovedAt = null;
                existing.TechnicalSheetApprovedBy = null;
                keepPartIds.Add(existing.Id);
                continue;
            }

            incoming.Id = Guid.NewGuid();
            incoming.ProductionOrderId = id;
            incoming.EstadoAprobacion = "Pendiente";
            incoming.EstadoFicha = "Pendiente";
            incoming.IsTechnicalSheetApproved = false;
            incoming.TechnicalSheetApprovedAt = null;
            incoming.TechnicalSheetApprovedBy = null;
            order.Parts.Add(incoming);
            keepPartIds.Add(incoming.Id);
        }

        var toRemove = order.Parts.Where(p => !keepPartIds.Contains(p.Id)).ToList();
        foreach (var part in toRemove)
            _context.Remove(part);

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "UPDATE_OT",
            $"Se actualizó la OT {order.OTNumber} del cliente {order.Cliente}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"
        );

        return Ok(order);
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

    /// <summary>Razones sociales únicas de OT existentes (autocompletar en nueva OT).</summary>
    [HttpGet("clients-suggestions")]
    public async Task<ActionResult<IEnumerable<string>>> GetClientSuggestions(
        [FromQuery] string? q = null,
        [FromQuery] int limit = 30)
    {
        limit = Math.Clamp(limit, 1, 100);

        var query = _context.ProductionOrders
            .AsNoTracking()
            .Where(o => !string.IsNullOrWhiteSpace(o.Cliente));

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(o => o.Cliente.ToLower().Contains(term));
        }

        var list = await query
            .Select(o => o.Cliente.Trim())
            .Distinct()
            .OrderBy(c => c)
            .Take(limit)
            .ToListAsync();

        return Ok(list);
    }

    /// <summary>
    /// Sube archivos a uploads/OTS/{documents|images|ampliaciones|adjuntos}/ con nombre {orderId}_{fecha}_{índice}_{nombre}.
    /// Actualiza AdjuntosJson de la pieza indicada.
    /// </summary>
    [HttpPost("{orderId:guid}/attachments")]
    [RequestSizeLimit(104_857_600)]
    [RequestFormLimits(MultipartBodyLengthLimit = 104_857_600)]
    public async Task<IActionResult> UploadAttachments(
        Guid orderId,
        [FromForm] string category,
        [FromForm] Guid partId,
        CancellationToken cancellationToken)
    {
        if (Request.Form.Files.Count == 0)
            return BadRequest(new { message = "No se enviaron archivos." });

        var cat = (category ?? string.Empty).Trim().ToLowerInvariant();
        string subDir;
        HashSet<string> allowedExt;
        string kindTag;

        switch (cat)
        {
            case "documents":
                subDir = "documents";
                allowedExt = DocumentExtensions;
                kindTag = "document";
                break;
            case "images":
                subDir = "images";
                allowedExt = ImageExtensions;
                kindTag = "image";
                break;
            case "ampliaciones":
                subDir = "ampliaciones";
                allowedExt = ImageExtensions;
                kindTag = "ampliacion";
                break;
            case "adjuntos":
                subDir = "adjuntos";
                allowedExt = ImageExtensions;
                kindTag = "adjunto";
                break;
            default:
                return BadRequest(new { message = "category debe ser 'documents', 'images', 'ampliaciones' o 'adjuntos'." });
        }

        var order = await _context.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order == null)
            return NotFound(new { message = "OT no encontrada." });

        var part = order.Parts.FirstOrDefault(p => p.Id == partId);
        if (part == null)
            return BadRequest(new { message = "La pieza no pertenece a esta OT." });

        var uploadsRoot = Path.Combine(GetUploadsRoot(), "OTS", subDir);
        Directory.CreateDirectory(uploadsRoot);

        var stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var added = new List<OtAttachmentRecord>();
        var seq = 0;

        foreach (var file in Request.Form.Files)
        {
            if (file.Length == 0)
                continue;
            if (file.Length > MaxFileBytes)
                return BadRequest(new { message = $"El archivo '{file.FileName}' supera el máximo de {MaxFileBytes / 1_048_576} MB." });

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext) || !allowedExt.Contains(ext))
                return BadRequest(new { message = $"Tipo no permitido para {cat}: '{file.FileName}'." });

            seq++;
            var safeBase = SanitizeFileBaseName(file.FileName);
            var storedName = $"{orderId:N}_{stamp}_{seq}_{safeBase}{ext}";
            var physicalPath = Path.Combine(uploadsRoot, storedName);

            await using (var stream = System.IO.File.Create(physicalPath))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            var relative = Path.Combine("OTS", subDir, storedName).Replace('\\', '/');
            var publicUrl = "/uploads/" + relative;

            added.Add(new OtAttachmentRecord
            {
                Kind = kindTag,
                Category = cat,
                StoredFileName = storedName,
                OriginalFileName = Path.GetFileName(file.FileName),
                RelativePath = relative,
                PublicUrl = publicUrl,
                ContentType = file.ContentType,
                SizeBytes = file.Length,
                UploadedAtUtc = DateTime.UtcNow,
            });
        }

        if (added.Count == 0)
            return BadRequest(new { message = "No hay archivos válidos para guardar." });

        var list = DeserializeAttachments(part.AdjuntosJson);
        list.AddRange(added);
        part.AdjuntosJson = JsonSerializer.Serialize(list, JsonAttachOptions);
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = User.Identity?.Name ?? "Sistema";

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "OT_ATTACHMENTS",
            $"Se agregaron {added.Count} adjunto(s) {cat} a OT {order.OTNumber} / pieza {partId}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok(new { added = added.Count, files = added });
    }

    [HttpDelete("{orderId:guid}/attachments")]
    public async Task<IActionResult> DeleteAttachment(
        Guid orderId,
        [FromBody] DeleteAttachmentRequest request,
        CancellationToken cancellationToken)
    {
        if (request.PartId == Guid.Empty || string.IsNullOrWhiteSpace(request.PublicUrl))
            return BadRequest(new { message = "partId y publicUrl son obligatorios." });

        var order = await _context.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order == null)
            return NotFound(new { message = "OT no encontrada." });

        var part = order.Parts.FirstOrDefault(p => p.Id == request.PartId);
        if (part == null)
            return BadRequest(new { message = "La pieza no pertenece a esta OT." });

        var list = DeserializeAttachments(part.AdjuntosJson);
        var targetUrl = request.PublicUrl.Trim();
        var removed = list.FirstOrDefault(a => string.Equals(a.PublicUrl, targetUrl, StringComparison.OrdinalIgnoreCase));
        if (removed == null)
            return NotFound(new { message = "Adjunto no encontrado en la pieza." });

        list.Remove(removed);
        part.AdjuntosJson = JsonSerializer.Serialize(list, JsonAttachOptions);
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = User.Identity?.Name ?? "Sistema";

        if (!string.IsNullOrWhiteSpace(removed.RelativePath))
        {
            var physicalPath = Path.Combine(GetUploadsRoot(), removed.RelativePath.Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(physicalPath))
            {
                try
                {
                    System.IO.File.Delete(physicalPath);
                }
                catch
                {
                    // si falla el borrado físico, igual conservamos la referencia removida de DB
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "OT_ATTACHMENT_DELETE",
            $"Se eliminó adjunto de OT {order.OTNumber} / pieza {part.PartName}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok(new { deleted = true, publicUrl = removed.PublicUrl });
    }

    [HttpPut("{orderId:guid}/parts/{partId:guid}/design-plan")]
    public async Task<IActionResult> UpdatePartDesignPlan(
        Guid orderId,
        Guid partId,
        [FromBody] UpdatePartDesignPlanRequest request,
        CancellationToken cancellationToken)
    {
        var order = await _context.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order == null)
            return NotFound(new { message = "OT no encontrada." });

        var part = order.Parts.FirstOrDefault(p => p.Id == partId);
        if (part == null)
            return BadRequest(new { message = "La pieza no pertenece a esta OT." });

        if (!string.IsNullOrWhiteSpace(request.Prioridad))
        {
            var prioridad = request.Prioridad.Trim();
            var permitidas = new[] { "Baja", "Normal", "Alta", "Urgente" };
            if (!permitidas.Contains(prioridad, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = "Prioridad inválida. Use: Baja, Normal, Alta o Urgente." });

            part.Prioridad = permitidas.First(p => string.Equals(p, prioridad, StringComparison.OrdinalIgnoreCase));
        }

        if (request.Disenador is not null)
            part.Disenador = string.IsNullOrWhiteSpace(request.Disenador) ? null : request.Disenador.Trim();

        part.EstadoAprobacion = "Pendiente";
        part.EstadoFicha = "Pendiente";
        part.IsTechnicalSheetApproved = false;
        part.TechnicalSheetApprovedAt = null;
        part.TechnicalSheetApprovedBy = null;
        order.Status = "Pendiente";

        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = User.Identity?.Name ?? "Sistema";

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "UPDATE_OT_DESIGN_PLAN",
            $"Se actualizó prioridad/diseñador en OT {order.OTNumber} / pieza {part.PartName}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok(new
        {
            id = part.Id,
            prioridad = part.Prioridad,
            disenador = part.Disenador,
        });
    }

    private string GetUploadsRoot()
    {
        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
        return Path.Combine(webRoot, "uploads");
    }

    private static string SanitizeFileBaseName(string fileName)
    {
        var baseName = Path.GetFileNameWithoutExtension(fileName);
        if (string.IsNullOrWhiteSpace(baseName))
            baseName = "archivo";
        foreach (var c in Path.GetInvalidFileNameChars())
            baseName = baseName.Replace(c, '_');
        baseName = baseName.Replace(' ', '_');
        if (baseName.Length > 80)
            baseName = baseName[..80];
        return baseName;
    }

    private static List<OtAttachmentRecord> DeserializeAttachments(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "[]")
            return new List<OtAttachmentRecord>();
        try
        {
            return JsonSerializer.Deserialize<List<OtAttachmentRecord>>(json, JsonAttachOptions)
                ?? new List<OtAttachmentRecord>();
        }
        catch
        {
            return new List<OtAttachmentRecord>();
        }
    }

    private sealed class OtAttachmentRecord
    {
        public string Kind { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string StoredFileName { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string RelativePath { get; set; } = string.Empty;
        public string PublicUrl { get; set; } = string.Empty;
        public string? ContentType { get; set; }
        public long SizeBytes { get; set; }
        public DateTime UploadedAtUtc { get; set; }
    }

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
