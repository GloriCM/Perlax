using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Common;
using Perlax.Modules.Production.Application.Orders;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class ProductionOrderService : IProductionOrderService
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

    private const long MaxFileBytes = 26_214_400;

    private readonly ProductionDbContext _db;

    public ProductionOrderService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ProductionOrder>> ListAsync(CancellationToken ct = default) =>
        await _db.ProductionOrders
            .AsNoTracking()
            .Include(o => o.Parts)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

    public async Task<ProductionOrder> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await _db.ProductionOrders
            .AsNoTracking()
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
        ?? throw new KeyNotFoundException("OT no encontrada.");

    public async Task<ProductionOrder> CreateAsync(ProductionOrder order, string userName, CancellationToken ct = default)
    {
        var isRepeticion = IsRepeticionAsignacion(order.Asignacion);
        if (!isRepeticion)
        {
            var isDuplicate = await _db.ProductionOrders.AnyAsync(o =>
                o.Cliente.ToLower() == order.Cliente.ToLower() &&
                o.ProductName.ToLower() == order.ProductName.ToLower(), ct);

            if (isDuplicate)
                throw new ResourceConflictException("Ya existe una orden de trabajo con el mismo cliente y nombre de producto.");
        }

        order.Id = Guid.NewGuid();
        order.CreatedAt = DateTime.UtcNow;
        order.CreatedBy = userName;

        foreach (var part in order.Parts)
        {
            part.Id = Guid.NewGuid();
            part.ProductionOrderId = order.Id;
            // Nueva OT: ficha debe re-aprobarse aunque venga clonada.
            part.IsTechnicalSheetApproved = false;
            part.TechnicalSheetApprovedAt = null;
            part.TechnicalSheetApprovedBy = null;
            part.TechnicalSheetRejectionReason = null;
            if (string.IsNullOrWhiteSpace(part.EstadoFicha) || part.EstadoFicha == "OK")
                part.EstadoFicha = "Pendiente";
            if (string.IsNullOrWhiteSpace(part.EstadoAprobacion) || part.EstadoAprobacion == "Aprobado")
                part.EstadoAprobacion = "Pendiente";
        }

        _db.ProductionOrders.Add(order);
        await _db.SaveChangesAsync(ct);
        return order;
    }

    public async Task<ProductionOrder> UpdateAsync(Guid id, ProductionOrder request, string userName, CancellationToken ct = default)
    {
        var order = await _db.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("OT no encontrada.");

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
        order.UpdatedBy = userName;

        var existingPartsById = order.Parts.ToDictionary(p => p.Id, p => p);
        var keepPartIds = new HashSet<Guid>();

        foreach (var incoming in request.Parts)
        {
            if (incoming.Id != Guid.Empty && existingPartsById.TryGetValue(incoming.Id, out var existing))
            {
                _db.Entry(existing).CurrentValues.SetValues(incoming);
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
            _db.Remove(part);

        await _db.SaveChangesAsync(ct);
        return order;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("OT no encontrada.");

        _db.ProductionOrders.Remove(order);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> ExistsDuplicateAsync(string cliente, string productName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(cliente) || string.IsNullOrWhiteSpace(productName))
            throw new InvalidOperationException("Cliente y producto son obligatorios.");

        return await _db.ProductionOrders.AnyAsync(o =>
            o.Cliente.ToLower() == cliente.ToLower() &&
            o.ProductName.ToLower() == productName.ToLower(), ct);
    }

    public async Task<IReadOnlyList<OtDesignSummaryDto>> GetDesignsByClientAsync(string cliente, CancellationToken ct = default) =>
        await _db.ProductionOrders
            .AsNoTracking()
            .Where(o => o.Cliente.ToLower().Contains(cliente.ToLower()))
            .Select(o => new OtDesignSummaryDto(o.OTNumber, o.ProductName, o.CreatedAt))
            .ToListAsync(ct);

    public async Task<string> GetNextNumberAsync(CancellationToken ct = default)
    {
        var numbers = await _db.ProductionOrders.Select(o => o.OTNumber).ToListAsync(ct);
        var maxNumber = 0;
        foreach (var numStr in numbers)
        {
            if (int.TryParse(numStr, out var val) && val > maxNumber)
                maxNumber = val;
        }
        return (maxNumber + 1).ToString();
    }

    public async Task<IReadOnlyList<string>> GetClientSuggestionsAsync(string? q = null, int limit = 30, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var query = _db.ProductionOrders.AsNoTracking().Where(o => !string.IsNullOrWhiteSpace(o.Cliente));

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(o => o.Cliente.ToLower().Contains(term));
        }

        return await query
            .Select(o => o.Cliente.Trim())
            .Distinct()
            .OrderBy(c => c)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ReusableOrderSummaryDto>> SearchReusableAsync(string? q, int limit = 30, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit <= 0 ? 30 : limit, 1, 80);
        var term = string.IsNullOrWhiteSpace(q) ? null : q.Trim().ToLowerInvariant();

        var query = _db.ProductionOrders.AsNoTracking().Include(o => o.Parts).AsQueryable();
        if (term != null)
        {
            query = query.Where(o =>
                o.OTNumber.ToLower().Contains(term) ||
                o.Cliente.ToLower().Contains(term) ||
                o.ProductName.ToLower().Contains(term) ||
                (o.ProductCode != null && o.ProductCode.ToLower().Contains(term)));
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        var orderIds = orders.Select(o => o.Id).ToList();
        var lastOps = await _db.ManufacturingOrders.AsNoTracking()
            .Where(m => orderIds.Contains(m.ProductionOrderId) && m.OpeningDate != null)
            .GroupBy(m => m.ProductionOrderId)
            .Select(g => new { ProductionOrderId = g.Key, OpNumber = g.OrderByDescending(x => x.OpeningDate).Select(x => x.OpNumber).FirstOrDefault() })
            .ToListAsync(ct);
        var lastOpByOrder = lastOps.ToDictionary(x => x.ProductionOrderId, x => x.OpNumber);

        return orders
            .Select(o => new ReusableOrderSummaryDto(
                o.Id,
                o.OTNumber,
                o.Cliente,
                o.ProductName,
                o.Asignacion,
                o.Parts?.Count ?? 0,
                o.Parts != null && o.Parts.Any(p => p.IsTechnicalSheetApproved),
                lastOpByOrder.TryGetValue(o.Id, out var op) ? op : null,
                o.CreatedAt))
            .OrderByDescending(o => o.HasApprovedFicha)
            .ThenByDescending(o => o.CreatedAt)
            .ToList();
    }

    public async Task<CloneOtTemplateDto> GetCloneTemplateAsync(Guid sourceOrderId, CancellationToken ct = default)
    {
        var source = await _db.ProductionOrders.AsNoTracking()
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == sourceOrderId, ct)
            ?? throw new KeyNotFoundException("OT origen no encontrada.");

        if (source.Parts == null || source.Parts.Count == 0)
            throw new InvalidOperationException("La OT origen no tiene piezas/ficha para clonar.");

        var lastOp = await _db.ManufacturingOrders.AsNoTracking()
            .Where(m => m.ProductionOrderId == sourceOrderId && m.OpeningDate != null)
            .OrderByDescending(m => m.OpeningDate)
            .Select(m => m.OpNumber)
            .FirstOrDefaultAsync(ct);

        var nextNumber = await GetNextNumberAsync(ct);
        var draft = new ProductionOrder
        {
            Id = Guid.Empty,
            OTNumber = nextNumber,
            Cliente = source.Cliente,
            EjecutivoCuenta = source.EjecutivoCuenta,
            FechaSolicitud = DateTime.UtcNow,
            Asignacion = "Repeticion sin Cambio",
            LineaPT = source.LineaPT,
            NumeroPartes = source.NumeroPartes > 0 ? source.NumeroPartes : source.Parts.Count,
            ProductCode = source.ProductCode,
            ProductName = source.ProductName,
            Status = "Borrador",
            Parts = source.Parts.Select(ClonePartForTemplate).ToList(),
        };

        return new CloneOtTemplateDto(source.Id, source.OTNumber, lastOp, draft);
    }

    private static OrderPart ClonePartForTemplate(OrderPart source)
    {
        var origenNote = string.IsNullOrWhiteSpace(source.Notas)
            ? null
            : source.Notas.Trim();

        return new OrderPart
        {
            Id = Guid.Empty,
            ProductionOrderId = Guid.Empty,
            PartName = source.PartName,
            SustratoSup = source.SustratoSup,
            SustratoMed = source.SustratoMed,
            SustratoInf = source.SustratoInf,
            DireccionFibra = source.DireccionFibra,
            TipoFlauta = source.TipoFlauta,
            DireccionFlauta = source.DireccionFlauta,
            Alto = source.Alto,
            Largo = source.Largo,
            Ancho = source.Ancho,
            Fuelle = source.Fuelle,
            Cabida = source.Cabida,
            AltoPliego = source.AltoPliego,
            AnchoPliego = source.AnchoPliego,
            Prioridad = source.Prioridad,
            Disenador = source.Disenador,
            EstadoBoceto = "Pendiente",
            EstadoArtes = "Pendiente",
            EstadoFicha = "Pendiente",
            EstadoMuestra = source.EstadoMuestra,
            EstadoAprobacion = "Pendiente",
            EstadoPlancha = "No",
            EstadoFotomecanica = source.EstadoFotomecanica,
            IsTechnicalSheetApproved = false,
            TechnicalSheetApprovedAt = null,
            TechnicalSheetApprovedBy = null,
            TechnicalSheetRejectionReason = null,
            TroquelNuevo = false,
            CodigoTroquel = source.CodigoTroquel,
            ManijaTipo = source.ManijaTipo,
            ManijaRef = source.ManijaRef,
            ManijaLargo = source.ManijaLargo,
            TintaC = source.TintaC,
            TintaM = source.TintaM,
            TintaY = source.TintaY,
            TintaK = source.TintaK,
            TintasEspeciales = source.TintasEspeciales,
            Terminado1 = source.Terminado1,
            Terminado2 = source.Terminado2,
            Estampado = source.Estampado,
            PieImprenta = source.PieImprenta,
            CondicionRemision = source.CondicionRemision,
            CondicionCertificado = source.CondicionCertificado,
            CondicionFactura = source.CondicionFactura,
            CondicionOrdenCompra = source.CondicionOrdenCompra,
            Notas = origenNote,
            FabricationProcessesJson = source.FabricationProcessesJson,
            // No se reutilizan adjuntos del origen (evita borrar/compartir archivos).
            AdjuntosJson = "[]",
        };
    }

    private static bool IsRepeticionAsignacion(string? asignacion) =>
        !string.IsNullOrWhiteSpace(asignacion) &&
        asignacion.Contains("Repeticion", StringComparison.OrdinalIgnoreCase);

    public async Task<UploadAttachmentsResultDto> UploadAttachmentsAsync(
        Guid orderId,
        Guid partId,
        string category,
        string uploadsRoot,
        IReadOnlyList<OtUploadFileDto> files,
        string userName,
        CancellationToken ct = default)
    {
        if (files == null || files.Count == 0)
            throw new InvalidOperationException("No se enviaron archivos.");

        var cat = (category ?? string.Empty).Trim().ToLowerInvariant();
        if (!TryResolveCategory(cat, out var subDir, out var allowedExt, out var kindTag))
            throw new InvalidOperationException("category debe ser 'documents', 'images', 'ampliaciones' o 'adjuntos'.");

        var order = await _db.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException("OT no encontrada.");

        var part = order.Parts.FirstOrDefault(p => p.Id == partId)
            ?? throw new InvalidOperationException("La pieza no pertenece a esta OT.");

        var categoryRoot = Path.Combine(uploadsRoot, "OTS", subDir);
        Directory.CreateDirectory(categoryRoot);

        var stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var added = new List<OtAttachmentDto>();
        var seq = 0;

        foreach (var file in files)
        {
            if (file.Length == 0)
                continue;
            if (file.Length > MaxFileBytes)
                throw new InvalidOperationException($"El archivo '{file.FileName}' supera el maximo de {MaxFileBytes / 1_048_576} MB.");

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext) || !allowedExt.Contains(ext))
                throw new InvalidOperationException($"Tipo no permitido para {cat}: '{file.FileName}'.");

            seq++;
            var safeBase = SanitizeFileBaseName(file.FileName);
            var storedName = $"{orderId:N}_{stamp}_{seq}_{safeBase}{ext}";
            var physicalPath = Path.Combine(categoryRoot, storedName);

            await using (var stream = File.Create(physicalPath))
            {
                await file.Content.CopyToAsync(stream, ct);
            }

            var relative = Path.Combine("OTS", subDir, storedName).Replace('\\', '/');
            added.Add(new OtAttachmentDto(
                kindTag,
                cat,
                storedName,
                Path.GetFileName(file.FileName),
                relative,
                "/uploads/" + relative,
                file.ContentType,
                file.Length,
                DateTime.UtcNow));
        }

        if (added.Count == 0)
            throw new InvalidOperationException("No hay archivos validos para guardar.");

        var list = DeserializeAttachments(part.AdjuntosJson);
        list.AddRange(added.Select(a => new AttachmentRecord
        {
            Kind = a.Kind,
            Category = a.Category,
            StoredFileName = a.StoredFileName,
            OriginalFileName = a.OriginalFileName,
            RelativePath = a.RelativePath,
            PublicUrl = a.PublicUrl,
            ContentType = a.ContentType,
            SizeBytes = a.SizeBytes,
            UploadedAtUtc = a.UploadedAtUtc
        }));
        part.AdjuntosJson = JsonSerializer.Serialize(list, JsonAttachOptions);
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);

        return new UploadAttachmentsResultDto(added.Count, added);
    }

    public async Task DeleteAttachmentAsync(
        Guid orderId,
        Guid partId,
        string publicUrl,
        string uploadsRoot,
        string userName,
        CancellationToken ct = default)
    {
        if (partId == Guid.Empty || string.IsNullOrWhiteSpace(publicUrl))
            throw new InvalidOperationException("partId y publicUrl son obligatorios.");

        var order = await _db.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException("OT no encontrada.");

        var part = order.Parts.FirstOrDefault(p => p.Id == partId)
            ?? throw new InvalidOperationException("La pieza no pertenece a esta OT.");

        var list = DeserializeAttachments(part.AdjuntosJson);
        var targetUrl = publicUrl.Trim();
        var removed = list.FirstOrDefault(a => string.Equals(a.PublicUrl, targetUrl, StringComparison.OrdinalIgnoreCase))
            ?? throw new KeyNotFoundException("Adjunto no encontrado en la pieza.");

        list.Remove(removed);
        part.AdjuntosJson = JsonSerializer.Serialize(list, JsonAttachOptions);
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = userName;

        if (!string.IsNullOrWhiteSpace(removed.RelativePath))
        {
            var physicalPath = Path.Combine(uploadsRoot, removed.RelativePath.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(physicalPath))
            {
                try { File.Delete(physicalPath); }
                catch { /* ignore physical delete failures */ }
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<PartDesignPlanResultDto> UpdatePartDesignPlanAsync(
        Guid orderId,
        Guid partId,
        UpdatePartDesignPlanCommand command,
        string userName,
        CancellationToken ct = default)
    {
        var order = await _db.ProductionOrders
            .Include(o => o.Parts)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException("OT no encontrada.");

        var part = order.Parts.FirstOrDefault(p => p.Id == partId)
            ?? throw new InvalidOperationException("La pieza no pertenece a esta OT.");

        if (!string.IsNullOrWhiteSpace(command.Prioridad))
        {
            var prioridad = command.Prioridad.Trim();
            var permitidas = new[] { "Baja", "Normal", "Alta", "Urgente" };
            if (!permitidas.Contains(prioridad, StringComparer.OrdinalIgnoreCase))
                throw new InvalidOperationException("Prioridad invalida. Use: Baja, Normal, Alta o Urgente.");

            part.Prioridad = permitidas.First(p => string.Equals(p, prioridad, StringComparison.OrdinalIgnoreCase));
        }

        if (command.Disenador is not null)
            part.Disenador = string.IsNullOrWhiteSpace(command.Disenador) ? null : command.Disenador.Trim();

        part.EstadoAprobacion = "Pendiente";
        part.EstadoFicha = "Pendiente";
        part.IsTechnicalSheetApproved = false;
        part.TechnicalSheetApprovedAt = null;
        part.TechnicalSheetApprovedBy = null;
        order.Status = "Pendiente";
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = userName;

        await _db.SaveChangesAsync(ct);
        return new PartDesignPlanResultDto(part.Id, part.Prioridad, part.Disenador);
    }

    private static bool TryResolveCategory(
        string cat,
        out string subDir,
        out HashSet<string> allowedExt,
        out string kindTag)
    {
        switch (cat)
        {
            case "documents":
                subDir = "documents";
                allowedExt = DocumentExtensions;
                kindTag = "document";
                return true;
            case "images":
                subDir = "images";
                allowedExt = ImageExtensions;
                kindTag = "image";
                return true;
            case "ampliaciones":
                subDir = "ampliaciones";
                allowedExt = ImageExtensions;
                kindTag = "ampliacion";
                return true;
            case "adjuntos":
                subDir = "adjuntos";
                allowedExt = ImageExtensions;
                kindTag = "adjunto";
                return true;
            default:
                subDir = string.Empty;
                allowedExt = ImageExtensions;
                kindTag = string.Empty;
                return false;
        }
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

    private static List<AttachmentRecord> DeserializeAttachments(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "[]")
            return new List<AttachmentRecord>();
        try
        {
            return JsonSerializer.Deserialize<List<AttachmentRecord>>(json, JsonAttachOptions)
                ?? new List<AttachmentRecord>();
        }
        catch
        {
            return new List<AttachmentRecord>();
        }
    }

    private sealed class AttachmentRecord
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
}