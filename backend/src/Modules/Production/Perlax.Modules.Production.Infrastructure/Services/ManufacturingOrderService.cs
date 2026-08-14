using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Common;
using Perlax.Modules.Production.Application.Manufacturing;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Parsing;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class ManufacturingOrderService : IManufacturingOrderService
{
    private readonly ProductionDbContext _db;
    private readonly IManufacturingOrderSyncService _syncService;

    public ManufacturingOrderService(ProductionDbContext db, IManufacturingOrderSyncService syncService)
    {
        _db = db;
        _syncService = syncService;
    }

    public async Task<IReadOnlyList<ManufacturingOrderListItemDto>> GetPendingOpeningAsync(CancellationToken ct = default)
    {
        await _syncService.EnsureApprovedOrdersSyncedAsync(ct);

        return await _db.ManufacturingOrders
            .AsNoTracking()
            .Where(m => m.OpeningDate == null)
            .Where(m => _db.CustomerOrders.Any(o => o.Id == m.CustomerOrderId && o.IsApproved))
            .OrderBy(m => m.OrderNumber)
            .ThenBy(m => m.OpNumber)
            .Select(m => new ManufacturingOrderListItemDto(
                m.Id,
                m.OpNumber,
                m.OrderNumber,
                m.OtNumber,
                m.ClientName,
                m.ProductName,
                m.ReferenceName,
                m.PurchaseOrderNumber,
                m.AgreedDeliveryDate,
                m.QuantityOrdered,
                m.ReceiptPercentage,
                m.QuantityToProduce,
                m.ApprovedUnitPrice,
                m.OpeningDate,
                m.Status,
                m.OpenedBy))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ManufacturingOrderStatusBoardItemDto>> GetStatusBoardAsync(
        string? status = null,
        string? q = null,
        CancellationToken ct = default)
    {
        var existingOtIds = await _db.ProductionOrders.AsNoTracking()
            .Where(o => o.Asignacion == "Existente")
            .Select(o => o.Id)
            .ToListAsync(ct);

        var orders = await _db.ManufacturingOrders
            .AsNoTracking()
            .Where(m => m.OpeningDate != null
                        || m.Status == "Abierta"
                        || m.Status == "Cerrada"
                        || existingOtIds.Contains(m.ProductionOrderId))
            .OrderByDescending(m => m.OpeningDate ?? m.CreatedAt)
            .ThenBy(m => m.OpNumber)
            .ToListAsync(ct);

        var existingOtSet = existingOtIds.ToHashSet();

        var producedMap = await LoadProducedQuantitiesByOpAsync(ct);
        var term = string.IsNullOrWhiteSpace(q) ? null : q.Trim().ToLowerInvariant();
        var statusFilter = string.IsNullOrWhiteSpace(status) ? null : status.Trim();

        return orders
            .Select(mo =>
            {
                var produced = GetProducedQuantity(mo.OpNumber, producedMap);
                var progressPercent = mo.QuantityToProduce > 0
                    ? Math.Min(100m, Math.Round(produced / mo.QuantityToProduce * 100m, 1))
                    : 0m;
                var displayStatus = ResolveDisplayStatus(mo, produced);

                return new ManufacturingOrderStatusBoardItemDto(
                    mo.Id,
                    mo.OpNumber,
                    mo.OrderNumber,
                    mo.OtNumber,
                    mo.ClientName,
                    mo.ProductName,
                    mo.ReferenceName,
                    mo.AgreedDeliveryDate,
                    mo.QuantityToProduce,
                    produced,
                    progressPercent,
                    displayStatus,
                    mo.Status,
                    mo.OpeningDate,
                    mo.OpenedBy,
                    existingOtSet.Contains(mo.ProductionOrderId)
                        || (mo.OtNumber ?? string.Empty).StartsWith("EXT-", StringComparison.OrdinalIgnoreCase));
            })
            .Where(row =>
            {
                if (statusFilter != null && !string.Equals(row.DisplayStatus, statusFilter, StringComparison.OrdinalIgnoreCase))
                    return false;

                if (term == null)
                    return true;

                return new[]
                {
                    row.OpNumber,
                    row.OrderNumber,
                    row.OtNumber,
                    row.ClientName,
                    row.ProductName,
                    row.ReferenceName,
                    row.DisplayStatus
                }.Any(field => (field ?? string.Empty).ToLowerInvariant().Contains(term));
            })
            .ToList();
    }

    public async Task<IReadOnlyList<ManufacturingOrderListItemDto>> GetOpenedAsync(CancellationToken ct = default) =>
                await _db.ManufacturingOrders
            .AsNoTracking()
            .Where(m => m.OpeningDate != null && m.Status == "Abierta")
            .OrderByDescending(m => m.OpeningDate)
            .Select(m => new ManufacturingOrderListItemDto(
                m.Id,
                m.OpNumber,
                m.OrderNumber,
                m.OtNumber,
                m.ClientName,
                m.ProductName,
                m.ReferenceName,
                m.PurchaseOrderNumber,
                m.AgreedDeliveryDate,
                m.QuantityOrdered,
                m.ReceiptPercentage,
                m.QuantityToProduce,
                m.ApprovedUnitPrice,
                m.OpeningDate,
                m.Status,
                m.OpenedBy))
            .ToListAsync(ct);

    public async Task<ManufacturingOrderListItemDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var mo = await _db.ManufacturingOrders.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new KeyNotFoundException("Orden de produccion no encontrada.");
        return MapListItem(mo) with { OpenedBy = mo.OpenedBy };
    }

    public async Task OpenAsync(Guid id, OpenManufacturingOrderCommand command, string userName, CancellationToken ct = default)
    {
        var mo = await _db.ManufacturingOrders.FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new KeyNotFoundException("Orden de produccion no encontrada.");

        if (mo.OpeningDate != null)
            throw new InvalidOperationException("Esta orden de produccion ya fue abierta.");
        if (command.OpeningDate == null)
            throw new InvalidOperationException("La fecha de apertura es obligatoria.");
        if (command.ReceiptPercentage is < 0 or > 100)
            throw new InvalidOperationException("El porcentaje de recibo debe estar entre 0 y 100.");

        var receiptPct = command.ReceiptPercentage ?? mo.ReceiptPercentage;
        mo.ReceiptPercentage = receiptPct;
        mo.QuantityToProduce = command.QuantityToProduce
            ?? ManufacturingOrderSyncService.CalculateQuantityToProduce(mo.QuantityOrdered, receiptPct);
        mo.OpeningDate = ToUtcDateTime(command.OpeningDate.Value);
        mo.Status = "Abierta";
        mo.OpenedBy = userName;
        mo.UpdatedAt = DateTime.UtcNow;
        mo.UpdatedBy = userName;

        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdatePendingAsync(Guid id, UpdateManufacturingOrderCommand command, string userName, CancellationToken ct = default)
    {
        var mo = await _db.ManufacturingOrders.FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new KeyNotFoundException("Orden de produccion no encontrada.");

        if (mo.OpeningDate != null)
            throw new InvalidOperationException("No se puede editar una OP ya abierta desde apertura.");
        if (command.ReceiptPercentage is < 0 or > 100)
            throw new InvalidOperationException("El porcentaje de recibo debe estar entre 0 y 100.");

        if (command.ReceiptPercentage.HasValue)
        {
            mo.ReceiptPercentage = command.ReceiptPercentage.Value;
            mo.QuantityToProduce = ManufacturingOrderSyncService.CalculateQuantityToProduce(mo.QuantityOrdered, mo.ReceiptPercentage);
        }

        if (command.QuantityToProduce.HasValue)
            mo.QuantityToProduce = command.QuantityToProduce.Value;

        mo.UpdatedAt = DateTime.UtcNow;
        mo.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
    }

    public async Task CloseAsync(Guid id, string userName, CancellationToken ct = default)
    {
        var mo = await _db.ManufacturingOrders.FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new KeyNotFoundException("Orden de produccion no encontrada.");

        if (mo.OpeningDate == null)
            throw new InvalidOperationException("Solo se pueden cerrar OP ya abiertas.");
        if (string.Equals(mo.Status, "Cerrada", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Esta orden de produccion ya esta cerrada.");

        mo.Status = "Cerrada";
        mo.UpdatedAt = DateTime.UtcNow;
        mo.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
    }

    public Task<ExistingOpParsedDto> ParseExistingFromPdfsAsync(
        ExistingOpPdfFileDto fichaPdf,
        ExistingOpPdfFileDto opPdf,
        CancellationToken ct = default)
    {
        ValidatePdf(fichaPdf, "ficha técnica");
        ValidatePdf(opPdf, "orden de producción");
        ct.ThrowIfCancellationRequested();
        return Task.FromResult(ExpertisLegacyPdfParser.Parse(fichaPdf.Content, opPdf.Content));
    }

    public async Task<ManufacturingOrderListItemDto> RegisterExistingFromPdfsAsync(
        ExistingOpPdfFileDto fichaPdf,
        ExistingOpPdfFileDto opPdf,
        string uploadsRoot,
        string userName,
        string? overridesJson = null,
        CancellationToken ct = default)
    {
        ValidatePdf(fichaPdf, "ficha técnica");
        ValidatePdf(opPdf, "orden de producción");
        if (string.IsNullOrWhiteSpace(uploadsRoot))
            throw new InvalidOperationException("No está configurada la carpeta de uploads.");

        await using var fichaMs = await CopyToMemoryAsync(fichaPdf.Content, ct);
        await using var opMs = await CopyToMemoryAsync(opPdf.Content, ct);

        fichaMs.Position = 0;
        opMs.Position = 0;
        var parsed = ExpertisLegacyPdfParser.Parse(fichaMs, opMs);
        parsed = ApplyOverrides(parsed, overridesJson);

        var adjuntosJson = await SaveLegacyPdfsAsync(
            uploadsRoot,
            parsed.OpNumber,
            fichaPdf.FileName,
            fichaPdf.ContentType,
            fichaMs,
            opPdf.FileName,
            opPdf.ContentType,
            opMs,
            ct);

        var legacyImportJson = BuildLegacyImportJson(
            fichaPdf.FileName,
            opPdf.FileName,
            parsed,
            userName);

        var command = new RegisterExistingOpCommand(
            parsed.OpNumber,
            parsed.OtNumber,
            parsed.ClientName,
            parsed.ProductName,
            parsed.ReferenceName,
            parsed.PurchaseOrderNumber,
            parsed.QuantityToProduce,
            parsed.QuantityOrdered,
            parsed.OpeningDate,
            parsed.AgreedDeliveryDate,
            parsed.CodigoTroquel,
            parsed.MaterialNotes,
            parsed.FabricationProcessesJson,
            parsed.LineaPT,
            parsed.Alto,
            parsed.Ancho,
            parsed.Largo,
            parsed.Terminado1,
            parsed.Terminado2,
            parsed.TintaC,
            parsed.TintaM,
            parsed.TintaY,
            parsed.TintaK,
            parsed.EjecutivoCuenta,
            parsed.Fuelle,
            parsed.PieImprenta,
            adjuntosJson,
            null,
            legacyImportJson,
            parsed.Parts);

        return await RegisterExistingAsync(command, userName, ct);
    }

    public async Task<ExistingOpLegacyImportDto?> GetLegacyImportAsync(Guid manufacturingOrderId, CancellationToken ct = default)
    {
        var mo = await _db.ManufacturingOrders.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == manufacturingOrderId, ct);
        if (mo is null) return null;

        var part = await _db.OrderParts.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == mo.OrderPartId, ct);
        if (part is null || string.IsNullOrWhiteSpace(part.LegacyImportJson))
            return new ExistingOpLegacyImportDto(mo.Id, mo.OpNumber, null);

        return new ExistingOpLegacyImportDto(mo.Id, mo.OpNumber, part.LegacyImportJson);
    }

    public async Task<ManufacturingOrderListItemDto> RegisterExistingAsync(
        RegisterExistingOpCommand command,
        string userName,
        CancellationToken ct = default)
    {
        var opNumber = (command.OpNumber ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(opNumber))
            throw new InvalidOperationException("El número de OP es obligatorio.");
        if (string.IsNullOrWhiteSpace(command.ClientName))
            throw new InvalidOperationException("El cliente es obligatorio.");
        if (string.IsNullOrWhiteSpace(command.ProductName))
            throw new InvalidOperationException("El producto / trabajo es obligatorio.");
        if (command.QuantityToProduce <= 0)
            throw new InvalidOperationException("La cantidad a producir debe ser mayor que cero.");

        var opKey = NormalizeOpKey(opNumber);
        var existingNumbers = await _db.ManufacturingOrders.AsNoTracking()
            .Select(m => m.OpNumber)
            .ToListAsync(ct);
        if (existingNumbers.Any(n => NormalizeOpKey(n) == opKey))
            throw new ResourceConflictException($"Ya existe la OP '{opNumber}' en la base de datos.");

        var otNumber = string.IsNullOrWhiteSpace(command.OtNumber)
            ? $"EXT-{opKey.ToUpperInvariant()}"
            : command.OtNumber.Trim();

        var orderNumber = string.IsNullOrWhiteSpace(command.PurchaseOrderNumber)
            ? $"LEG-{opKey.ToUpperInvariant()}"
            : command.PurchaseOrderNumber.Trim();

        var qtyOrdered = command.QuantityOrdered is > 0
            ? command.QuantityOrdered.Value
            : command.QuantityToProduce;

        var openingDate = command.OpeningDate == default
            ? DateTime.UtcNow.Date
            : ToUtcDateTime(command.OpeningDate);
        if (openingDate.Year < 2000)
            openingDate = DateTime.UtcNow.Date;
        var delivery = command.AgreedDeliveryDate.HasValue
            ? ToUtcDateTime(command.AgreedDeliveryDate.Value)
            : (DateTime?)null;

        var processesJson = string.IsNullOrWhiteSpace(command.FabricationProcessesJson)
            ? "[]"
            : command.FabricationProcessesJson.Trim();

        var notes = string.IsNullOrWhiteSpace(command.MaterialNotes)
            ? $"OP existente registrada desde documentos ({opNumber})."
            : command.MaterialNotes.Trim();

        var adjuntosJson = string.IsNullOrWhiteSpace(command.AdjuntosJson)
            ? "[]"
            : command.AdjuntosJson.Trim();

        var otId = Guid.NewGuid();
        var customerOrderId = Guid.NewGuid();
        var moId = Guid.NewGuid();

        var partSpecs = (command.Parts is { Count: > 0 }
            ? command.Parts
            : new[]
            {
                new ExistingOpParsedPartDto(
                    "Pieza Unica",
                    command.SustratoSup,
                    processesJson,
                    command.Alto,
                    command.Ancho,
                    command.Largo,
                    command.Fuelle,
                    null,
                    null,
                    null,
                    command.CodigoTroquel,
                    notes)
            }).ToList();

        var ot = new ProductionOrder
        {
            Id = otId,
            OTNumber = otNumber,
            Cliente = command.ClientName.Trim(),
            EjecutivoCuenta = string.IsNullOrWhiteSpace(command.EjecutivoCuenta) ? "Importado" : command.EjecutivoCuenta.Trim(),
            FechaSolicitud = openingDate,
            Asignacion = "Existente",
            LineaPT = string.IsNullOrWhiteSpace(command.LineaPT) ? "Otro" : command.LineaPT.Trim(),
            NumeroPartes = partSpecs.Count,
            ProductCode = "",
            ProductName = command.ProductName.Trim(),
            Status = "Autorizada",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName,
        };

        var orderParts = new List<OrderPart>();
        var orderItems = new List<CustomerOrderItem>();
        Guid partId = Guid.Empty;
        for (var i = 0; i < partSpecs.Count; i++)
        {
            var spec = partSpecs[i];
            var id = Guid.NewGuid();
            if (i == 0) partId = id;
            var isPrimary = i == 0;
            var partProcesses = string.IsNullOrWhiteSpace(spec.FabricationProcessesJson)
                ? (isPrimary ? processesJson : "[]")
                : spec.FabricationProcessesJson.Trim();
            var partNotes = string.IsNullOrWhiteSpace(spec.Notas) ? notes : spec.Notas.Trim();
            orderParts.Add(new OrderPart
            {
                Id = id,
                ProductionOrderId = otId,
                PartName = string.IsNullOrWhiteSpace(spec.PartName) ? $"Pieza {i + 1}" : spec.PartName.Trim(),
                SustratoSup = spec.Material?.Trim() ?? (isPrimary ? command.SustratoSup?.Trim() : null),
                Alto = spec.Alto ?? (isPrimary ? command.Alto ?? 0 : 0),
                Ancho = spec.Ancho ?? (isPrimary ? command.Ancho ?? 0 : 0),
                Largo = spec.Largo ?? (isPrimary ? command.Largo ?? 0 : 0),
                Fuelle = spec.Fuelle ?? (isPrimary ? command.Fuelle ?? 0 : 0),
                AltoPliego = spec.AltoPliego ?? 0,
                AnchoPliego = spec.AnchoPliego ?? 0,
                CodigoTroquel = spec.CodigoTroquel?.Trim() ?? (isPrimary ? command.CodigoTroquel?.Trim() : null),
                TroquelNuevo = false,
                TintaC = isPrimary && command.TintaC,
                TintaM = isPrimary && command.TintaM,
                TintaY = isPrimary && command.TintaY,
                TintaK = isPrimary && command.TintaK,
                Terminado1 = isPrimary ? command.Terminado1 : null,
                Terminado2 = isPrimary ? command.Terminado2 : null,
                PieImprenta = isPrimary ? command.PieImprenta : null,
                Notas = partNotes,
                FabricationProcessesJson = partProcesses,
                AdjuntosJson = isPrimary ? adjuntosJson : "[]",
                LegacyImportJson = isPrimary && !string.IsNullOrWhiteSpace(command.LegacyImportJson)
                    ? command.LegacyImportJson.Trim()
                    : null,
                EstadoFicha = "OK",
                EstadoAprobacion = "Aprobado",
                IsTechnicalSheetApproved = true,
                TechnicalSheetApprovedAt = DateTime.UtcNow,
                TechnicalSheetApprovedBy = userName,
            });
            orderItems.Add(new CustomerOrderItem
            {
                Id = Guid.NewGuid(),
                CustomerOrderId = customerOrderId,
                ProductionOrderId = otId,
                OrderPartId = id,
                Quantity = isPrimary ? qtyOrdered : (spec.Hojas is > 0 ? spec.Hojas.Value : 0),
                ApprovedUnitPrice = 0,
                ProductName = command.ProductName.Trim(),
                ReferenceName = spec.PartName,
            });
        }

        var customerOrder = new CustomerOrder
        {
            Id = customerOrderId,
            OrderNumber = orderNumber,
            OrderDate = openingDate,
            ClientName = command.ClientName.Trim(),
            PurchaseOrderNumber = command.PurchaseOrderNumber?.Trim() ?? "",
            AgreedDeliveryDate = delivery,
            Status = CustomerOrderStatuses.Approved,
            IsApproved = true,
            ApprovedAt = DateTime.UtcNow,
            ApprovedBy = userName,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName,
        };

        var mo = new ManufacturingOrder
        {
            Id = moId,
            OpNumber = opNumber,
            CustomerOrderId = customerOrderId,
            OrderPartId = partId,
            ProductionOrderId = otId,
            OrderNumber = orderNumber,
            OtNumber = otNumber,
            ClientName = command.ClientName.Trim(),
            ProductName = command.ProductName.Trim(),
            ReferenceName = command.ReferenceName?.Trim() ?? command.ProductName.Trim(),
            PurchaseOrderNumber = command.PurchaseOrderNumber?.Trim() ?? "",
            AgreedDeliveryDate = delivery,
            QuantityOrdered = qtyOrdered,
            ReceiptPercentage = 0,
            QuantityToProduce = command.QuantityToProduce,
            ApprovedUnitPrice = 0,
            OpeningDate = openingDate,
            Status = "Abierta",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName,
            OpenedBy = userName,
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = userName,
        };

        _db.ProductionOrders.Add(ot);
        _db.OrderParts.AddRange(orderParts);
        _db.CustomerOrders.Add(customerOrder);
        _db.CustomerOrderItems.AddRange(orderItems);
        _db.ManufacturingOrders.Add(mo);
        await _db.SaveChangesAsync(ct);

        return MapListItem(mo);
    }

    private async Task<Dictionary<string, decimal>> LoadProducedQuantitiesByOpAsync(CancellationToken ct)
    {
        var activities = await _db.ProductionActivities
            .AsNoTracking()
            .Where(a => a.Status == ProductionActivityStatuses.Done && a.ProductionOrderNumber != null)
            .Select(a => new { a.ProductionOrderNumber, a.QuantityProcessed })
            .ToListAsync(ct);

        return activities
            .GroupBy(a => NormalizeOpKey(a.ProductionOrderNumber))
            .Where(g => g.Key.Length > 0)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.QuantityProcessed));
    }

    private static ManufacturingOrderListItemDto MapListItem(ManufacturingOrder m) => new(
        m.Id,
        m.OpNumber,
        m.OrderNumber,
        m.OtNumber,
        m.ClientName,
        m.ProductName,
        m.ReferenceName,
        m.PurchaseOrderNumber,
        m.AgreedDeliveryDate,
        m.QuantityOrdered,
        m.ReceiptPercentage,
        m.QuantityToProduce,
        m.ApprovedUnitPrice,
        m.OpeningDate,
        m.Status,
        m.OpenedBy);

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

    private static DateTime ToUtcDateTime(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime()
    };

    private const long MaxPdfBytes = 26_214_400;

    private static void ValidatePdf(ExistingOpPdfFileDto file, string label)
    {
        if (file is null || file.Length <= 0)
            throw new InvalidOperationException($"Debe adjuntar el PDF de {label}.");
        if (file.Length > MaxPdfBytes)
            throw new InvalidOperationException($"El PDF de {label} supera el máximo de {MaxPdfBytes / 1_048_576} MB.");
        var ext = Path.GetExtension(file.FileName ?? string.Empty);
        if (!string.Equals(ext, ".pdf", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"El archivo de {label} debe ser PDF.");
    }

    private static async Task<MemoryStream> CopyToMemoryAsync(Stream source, CancellationToken ct)
    {
        var ms = new MemoryStream();
        if (source.CanSeek) source.Position = 0;
        await source.CopyToAsync(ms, ct);
        ms.Position = 0;
        return ms;
    }

    private static async Task<string> SaveLegacyPdfsAsync(
        string uploadsRoot,
        string opNumber,
        string fichaFileName,
        string? fichaContentType,
        MemoryStream fichaMs,
        string opFileName,
        string? opContentType,
        MemoryStream opMs,
        CancellationToken ct)
    {
        var safeOp = new string((opNumber ?? "op").Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
        if (string.IsNullOrWhiteSpace(safeOp)) safeOp = "op";
        var stamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var relativeDir = Path.Combine("OTS", "existente", safeOp);
        var physicalDir = Path.Combine(uploadsRoot, relativeDir);
        Directory.CreateDirectory(physicalDir);

        var list = new List<object>();
        list.Add(await PersistOneAsync(physicalDir, relativeDir, "ficha", "ficha", fichaFileName, fichaContentType, fichaMs, stamp, 1, ct));
        list.Add(await PersistOneAsync(physicalDir, relativeDir, "op", "op", opFileName, opContentType, opMs, stamp, 2, ct));

        return JsonSerializer.Serialize(list, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    private static async Task<object> PersistOneAsync(
        string physicalDir,
        string relativeDir,
        string kind,
        string category,
        string originalName,
        string? contentType,
        MemoryStream content,
        string stamp,
        int seq,
        CancellationToken ct)
    {
        var ext = Path.GetExtension(originalName);
        if (string.IsNullOrWhiteSpace(ext)) ext = ".pdf";
        var safeBase = SanitizeFileBaseName(originalName);
        var storedName = $"{stamp}_{seq}_{kind}_{safeBase}{ext}";
        var physicalPath = Path.Combine(physicalDir, storedName);
        content.Position = 0;
        await using (var fs = File.Create(physicalPath))
        {
            await content.CopyToAsync(fs, ct);
        }

        var relative = Path.Combine(relativeDir, storedName).Replace('\\', '/');
        return new
        {
            kind,
            category,
            storedFileName = storedName,
            originalFileName = Path.GetFileName(originalName),
            relativePath = relative,
            publicUrl = "/uploads/" + relative,
            contentType = string.IsNullOrWhiteSpace(contentType) ? "application/pdf" : contentType,
            sizeBytes = content.Length,
            uploadedAtUtc = DateTime.UtcNow
        };
    }

    private static string SanitizeFileBaseName(string fileName)
    {
        var baseName = Path.GetFileNameWithoutExtension(fileName ?? "documento");
        var cleaned = new string(baseName.Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' ? ch : '_').ToArray());
        return string.IsNullOrWhiteSpace(cleaned) ? "documento" : cleaned[..Math.Min(cleaned.Length, 80)];
    }

    private static string BuildLegacyImportJson(
        string fichaFileName,
        string opFileName,
        ExistingOpParsedDto parsed,
        string userName)
    {
        var payload = new
        {
            source = "expertis-pdf",
            importedAtUtc = DateTime.UtcNow,
            importedBy = userName,
            fichaFileName,
            opFileName,
            rawFichaText = parsed.RawFichaText,
            rawOpText = parsed.RawOpText,
            parsed = new
            {
                parsed.OpNumber,
                parsed.ClientName,
                parsed.ProductName,
                parsed.ReferenceName,
                parsed.PurchaseOrderNumber,
                parsed.EjecutivoCuenta,
                parsed.LineaPT,
                parsed.QuantityToProduce,
                parsed.QuantityOrdered,
                parsed.OpeningDate,
                parsed.AgreedDeliveryDate,
                parsed.CodigoTroquel,
                parsed.MaterialNotes,
                parsed.FabricationProcessesJson,
                parsed.Alto,
                parsed.Ancho,
                parsed.Largo,
                parsed.Fuelle,
                parsed.Terminado1,
                parsed.Terminado2,
                parsed.PieImprenta,
                parsed.TintaC,
                parsed.TintaM,
                parsed.TintaY,
                parsed.TintaK,
                parsed.Warnings,
                parsed.Parts
            }
        };
        return JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });
    }

    private static ExistingOpParsedDto ApplyOverrides(ExistingOpParsedDto parsed, string? overridesJson)
    {
        if (string.IsNullOrWhiteSpace(overridesJson)) return parsed;
        using var doc = JsonDocument.Parse(overridesJson);
        var root = doc.RootElement;

        string? S(string name) =>
            root.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;
        decimal? D(string name)
        {
            if (!root.TryGetProperty(name, out var p)) return null;
            if (p.ValueKind == JsonValueKind.Number && p.TryGetDecimal(out var d)) return d;
            if (p.ValueKind == JsonValueKind.String && decimal.TryParse(p.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out d))
                return d;
            return null;
        }
        bool? B(string name) =>
            root.TryGetProperty(name, out var p) && (p.ValueKind is JsonValueKind.True or JsonValueKind.False)
                ? p.GetBoolean()
                : null;
        DateTime? Dt(string name)
        {
            var s = S(name);
            if (string.IsNullOrWhiteSpace(s)) return null;
            return DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt) ? dt : null;
        }

        return parsed with
        {
            OpNumber = S("opNumber") ?? parsed.OpNumber,
            OtNumber = S("otNumber") ?? parsed.OtNumber,
            ClientName = S("clientName") ?? parsed.ClientName,
            ProductName = S("productName") ?? parsed.ProductName,
            ReferenceName = S("referenceName") ?? parsed.ReferenceName,
            PurchaseOrderNumber = S("purchaseOrderNumber") ?? parsed.PurchaseOrderNumber,
            EjecutivoCuenta = S("ejecutivoCuenta") ?? parsed.EjecutivoCuenta,
            LineaPT = S("lineaPT") ?? parsed.LineaPT,
            QuantityToProduce = D("quantityToProduce") ?? parsed.QuantityToProduce,
            QuantityOrdered = D("quantityOrdered") ?? parsed.QuantityOrdered,
            OpeningDate = Dt("openingDate") ?? parsed.OpeningDate,
            AgreedDeliveryDate = Dt("agreedDeliveryDate") ?? parsed.AgreedDeliveryDate,
            CodigoTroquel = S("codigoTroquel") ?? parsed.CodigoTroquel,
            MaterialNotes = S("materialNotes") ?? parsed.MaterialNotes,
            FabricationProcessesJson = S("fabricationProcessesJson") ?? parsed.FabricationProcessesJson,
            Alto = D("alto") ?? parsed.Alto,
            Ancho = D("ancho") ?? parsed.Ancho,
            Largo = D("largo") ?? parsed.Largo,
            Fuelle = D("fuelle") ?? parsed.Fuelle,
            Terminado1 = S("terminado1") ?? parsed.Terminado1,
            Terminado2 = S("terminado2") ?? parsed.Terminado2,
            PieImprenta = S("pieImprenta") ?? parsed.PieImprenta,
            TintaC = B("tintaC") ?? parsed.TintaC,
            TintaM = B("tintaM") ?? parsed.TintaM,
            TintaY = B("tintaY") ?? parsed.TintaY,
            TintaK = B("tintaK") ?? parsed.TintaK,
            Parts = ReadPartsOverride(root) ?? parsed.Parts,
        };
    }

    private static IReadOnlyList<ExistingOpParsedPartDto>? ReadPartsOverride(JsonElement root)
    {
        if (!root.TryGetProperty("parts", out var p) || p.ValueKind != JsonValueKind.Array)
            return null;
        var list = new List<ExistingOpParsedPartDto>();
        foreach (var el in p.EnumerateArray())
        {
            if (el.ValueKind != JsonValueKind.Object) continue;
            string? S(string name) =>
                el.TryGetProperty(name, out var x) && x.ValueKind == JsonValueKind.String ? x.GetString() : null;
            decimal? D(string name)
            {
                if (!el.TryGetProperty(name, out var x)) return null;
                if (x.ValueKind == JsonValueKind.Number && x.TryGetDecimal(out var d)) return d;
                if (x.ValueKind == JsonValueKind.String && decimal.TryParse(x.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out d))
                    return d;
                return null;
            }
            var name = S("partName") ?? "Pieza Unica";
            list.Add(new ExistingOpParsedPartDto(
                name,
                S("material"),
                S("fabricationProcessesJson"),
                D("alto"),
                D("ancho"),
                D("largo"),
                D("fuelle"),
                D("altoPliego"),
                D("anchoPliego"),
                D("hojas"),
                S("codigoTroquel"),
                S("notas")));
        }
        return list.Count == 0 ? null : list;
    }
}