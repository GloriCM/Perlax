using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Common;
using Perlax.Modules.Production.Application.Manufacturing;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/manufacturing-orders")]
public class ManufacturingOrdersController : ControllerBase
{
    private readonly IManufacturingOrderService _orders;
    private readonly IAuditService _auditService;
    private readonly IWebHostEnvironment _environment;

    public ManufacturingOrdersController(
        IManufacturingOrderService orders,
        IAuditService auditService,
        IWebHostEnvironment environment)
    {
        _orders = orders;
        _auditService = auditService;
        _environment = environment;
    }

    [HttpGet("pending-opening")]
    public async Task<ActionResult<IEnumerable<object>>> GetPendingOpening(CancellationToken ct)
    {
        var rows = await _orders.GetPendingOpeningAsync(ct);
        return Ok(rows.Select(MapList));
    }

    [HttpGet("status-board")]
    public async Task<ActionResult<IEnumerable<object>>> GetStatusBoard(
        [FromQuery] string? status,
        [FromQuery] string? q,
        CancellationToken ct)
    {
        var rows = await _orders.GetStatusBoardAsync(status, q, ct);
        return Ok(rows.Select(r => new
        {
            id = r.Id,
            opNumber = r.OpNumber,
            orderNumber = r.OrderNumber,
            otNumber = r.OtNumber,
            clientName = r.ClientName,
            productName = r.ProductName,
            referenceName = r.ReferenceName,
            agreedDeliveryDate = r.AgreedDeliveryDate,
            quantityToProduce = r.QuantityToProduce,
            quantityProduced = r.QuantityProduced,
            progressPercent = r.ProgressPercent,
            displayStatus = r.DisplayStatus,
            status = r.Status,
            openingDate = r.OpeningDate,
            openedBy = r.OpenedBy,
            isExistingOp = r.IsExistingOp
        }));
    }

    [HttpGet("opened")]
    public async Task<ActionResult<IEnumerable<object>>> GetOpened(CancellationToken ct)
    {
        var rows = await _orders.GetOpenedAsync(ct);
        return Ok(rows.Select(MapList));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(MapList(await _orders.GetByIdAsync(id, ct)));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/open")]
    public async Task<ActionResult> Open(Guid id, [FromBody] OpenManufacturingOrderRequest request, CancellationToken ct)
    {
        try
        {
            await _orders.OpenAsync(
                id,
                new OpenManufacturingOrderCommand(request.OpeningDate, request.ReceiptPercentage, request.QuantityToProduce),
                CurrentUser(),
                ct);

            var detail = await _orders.GetByIdAsync(id, ct);
            await _auditService.LogAsync(
                User.Identity?.Name,
                User.Identity?.Name,
                "OPEN_MANUFACTURING_ORDER",
                $"Se abrio OP {detail.OpNumber} ({detail.ClientName})",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> UpdatePending(Guid id, [FromBody] UpdateManufacturingOrderRequest request, CancellationToken ct)
    {
        try
        {
            await _orders.UpdatePendingAsync(
                id,
                new UpdateManufacturingOrderCommand(request.ReceiptPercentage, request.QuantityToProduce),
                CurrentUser(),
                ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/close")]
    public async Task<ActionResult> Close(Guid id, CancellationToken ct)
    {
        try
        {
            var detail = await _orders.GetByIdAsync(id, ct);
            await _orders.CloseAsync(id, CurrentUser(), ct);
            await _auditService.LogAsync(
                User.Identity?.Name,
                User.Identity?.Name,
                "CLOSE_MANUFACTURING_ORDER",
                $"Se cerro OP {detail.OpNumber} ({detail.ClientName})",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("register-existing")]
    public async Task<ActionResult<object>> RegisterExisting([FromBody] RegisterExistingOpRequest request, CancellationToken ct)
    {
        try
        {
            var created = await _orders.RegisterExistingAsync(
                new RegisterExistingOpCommand(
                    request.OpNumber,
                    request.OtNumber,
                    request.ClientName,
                    request.ProductName,
                    request.ReferenceName,
                    request.PurchaseOrderNumber,
                    request.QuantityToProduce,
                    request.QuantityOrdered,
                    request.OpeningDate,
                    request.AgreedDeliveryDate,
                    request.CodigoTroquel,
                    request.MaterialNotes,
                    request.FabricationProcessesJson,
                    request.LineaPT,
                    request.Alto,
                    request.Ancho,
                    request.Largo,
                    request.Terminado1,
                    request.Terminado2,
                    request.TintaC,
                    request.TintaM,
                    request.TintaY,
                    request.TintaK,
                    request.EjecutivoCuenta,
                    request.Fuelle,
                    request.PieImprenta,
                    request.AdjuntosJson,
                    request.SustratoSup,
                    request.LegacyImportJson),
                CurrentUser(),
                ct);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "REGISTER_EXISTING_OP",
                $"Se registro OP existente {created.OpNumber} ({created.ClientName})",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(MapList(created));
        }
        catch (ResourceConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("parse-existing-pdfs")]
    [RequestSizeLimit(52_428_800)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52_428_800)]
    public async Task<ActionResult<object>> ParseExistingPdfs(
        [FromForm] IFormFile? fichaPdf,
        [FromForm] IFormFile? opPdf,
        CancellationToken ct)
    {
        try
        {
            await using var ficha = OpenPdfOrThrow(fichaPdf, "ficha técnica");
            await using var op = OpenPdfOrThrow(opPdf, "orden de producción");
            var parsed = await _orders.ParseExistingFromPdfsAsync(
                new ExistingOpPdfFileDto(fichaPdf!.FileName, fichaPdf.ContentType, fichaPdf.Length, ficha),
                new ExistingOpPdfFileDto(opPdf!.FileName, opPdf.ContentType, opPdf.Length, op),
                ct);
            return Ok(MapParsed(parsed));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("register-existing-from-pdfs")]
    [RequestSizeLimit(52_428_800)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52_428_800)]
    public async Task<ActionResult<object>> RegisterExistingFromPdfs(
        [FromForm] IFormFile? fichaPdf,
        [FromForm] IFormFile? opPdf,
        [FromForm] string? overridesJson,
        CancellationToken ct)
    {
        try
        {
            await using var ficha = OpenPdfOrThrow(fichaPdf, "ficha técnica");
            await using var op = OpenPdfOrThrow(opPdf, "orden de producción");
            var created = await _orders.RegisterExistingFromPdfsAsync(
                new ExistingOpPdfFileDto(fichaPdf!.FileName, fichaPdf.ContentType, fichaPdf.Length, ficha),
                new ExistingOpPdfFileDto(opPdf!.FileName, opPdf.ContentType, opPdf.Length, op),
                GetUploadsRoot(),
                CurrentUser(),
                overridesJson,
                ct);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "REGISTER_EXISTING_OP_PDF",
                $"Se registro OP existente desde PDFs {created.OpNumber} ({created.ClientName})",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(MapList(created));
        }
        catch (ResourceConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/legacy-import")]
    public async Task<ActionResult<object>> GetLegacyImport(Guid id, CancellationToken ct)
    {
        var row = await _orders.GetLegacyImportAsync(id, ct);
        if (row is null) return NotFound();
        return Ok(new
        {
            manufacturingOrderId = row.ManufacturingOrderId,
            opNumber = row.OpNumber,
            legacyImportJson = row.LegacyImportJson,
            hasImport = !string.IsNullOrWhiteSpace(row.LegacyImportJson)
        });
    }

    private static object MapList(ManufacturingOrderListItemDto m) => new
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

    private static object MapParsed(ExistingOpParsedDto p) => new
    {
        opNumber = p.OpNumber,
        otNumber = p.OtNumber,
        clientName = p.ClientName,
        productName = p.ProductName,
        referenceName = p.ReferenceName,
        purchaseOrderNumber = p.PurchaseOrderNumber,
        ejecutivoCuenta = p.EjecutivoCuenta,
        lineaPT = p.LineaPT,
        quantityToProduce = p.QuantityToProduce,
        quantityOrdered = p.QuantityOrdered,
        openingDate = p.OpeningDate,
        agreedDeliveryDate = p.AgreedDeliveryDate,
        codigoTroquel = p.CodigoTroquel,
        materialNotes = p.MaterialNotes,
        fabricationProcessesJson = p.FabricationProcessesJson,
        alto = p.Alto,
        ancho = p.Ancho,
        largo = p.Largo,
        fuelle = p.Fuelle,
        terminado1 = p.Terminado1,
        terminado2 = p.Terminado2,
        pieImprenta = p.PieImprenta,
        tintaC = p.TintaC,
        tintaM = p.TintaM,
        tintaY = p.TintaY,
        tintaK = p.TintaK,
        warnings = p.Warnings,
        rawFichaText = p.RawFichaText,
        rawOpText = p.RawOpText,
        parts = (p.Parts ?? []).Select(part => new
        {
            partName = part.PartName,
            material = part.Material,
            fabricationProcessesJson = part.FabricationProcessesJson,
            alto = part.Alto,
            ancho = part.Ancho,
            largo = part.Largo,
            fuelle = part.Fuelle,
            altoPliego = part.AltoPliego,
            anchoPliego = part.AnchoPliego,
            hojas = part.Hojas,
            codigoTroquel = part.CodigoTroquel,
            notas = part.Notas
        })
    };

    private string GetUploadsRoot()
    {
        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
        return Path.Combine(webRoot, "uploads");
    }

    private static Stream OpenPdfOrThrow(IFormFile? file, string label)
    {
        if (file is null || file.Length <= 0)
            throw new InvalidOperationException($"Debe adjuntar el PDF de {label}.");
        return file.OpenReadStream();
    }

    private string CurrentUser() => User.Identity?.Name ?? "Sistema";

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

    public sealed class RegisterExistingOpRequest
    {
        public string OpNumber { get; set; } = string.Empty;
        public string? OtNumber { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string? ReferenceName { get; set; }
        public string? PurchaseOrderNumber { get; set; }
        public decimal QuantityToProduce { get; set; }
        public decimal? QuantityOrdered { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime? AgreedDeliveryDate { get; set; }
        public string? CodigoTroquel { get; set; }
        public string? MaterialNotes { get; set; }
        public string? FabricationProcessesJson { get; set; }
        public string? LineaPT { get; set; }
        public decimal? Alto { get; set; }
        public decimal? Ancho { get; set; }
        public decimal? Largo { get; set; }
        public string? Terminado1 { get; set; }
        public string? Terminado2 { get; set; }
        public bool TintaC { get; set; }
        public bool TintaM { get; set; }
        public bool TintaY { get; set; }
        public bool TintaK { get; set; }
        public string? EjecutivoCuenta { get; set; }
        public decimal? Fuelle { get; set; }
        public string? PieImprenta { get; set; }
        public string? AdjuntosJson { get; set; }
        public string? SustratoSup { get; set; }
        public string? LegacyImportJson { get; set; }
    }
}