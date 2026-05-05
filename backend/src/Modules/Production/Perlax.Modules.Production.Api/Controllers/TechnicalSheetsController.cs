using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/technical-sheets")]
public class TechnicalSheetsController : ControllerBase
{
    private readonly ProductionDbContext _context;
    private readonly IAuditService _auditService;

    public TechnicalSheetsController(ProductionDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetList([FromQuery] string? q = null)
    {
        var query = _context.OrderParts
            .AsNoTracking()
            .Include(p => p.Order)
            .Where(p => p.Order != null);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(p =>
                (p.Order!.OTNumber ?? string.Empty).ToLower().Contains(term) ||
                (p.Order.Cliente ?? string.Empty).ToLower().Contains(term) ||
                (p.Order.ProductName ?? string.Empty).ToLower().Contains(term) ||
                (p.CodigoTroquel ?? string.Empty).ToLower().Contains(term));
        }

        var data = await query
            .OrderByDescending(p => p.Order!.CreatedAt)
            .Select(p => new
            {
                id = p.Id,
                productionOrderId = p.ProductionOrderId,
                orderId = p.ProductionOrderId,
                otNumber = p.Order!.OTNumber,
                pieza = p.PartName,
                cliente = p.Order.Cliente,
                productName = p.Order.ProductName,
                codigoTroquel = p.CodigoTroquel,
                productCode = p.Order.ProductCode,
                approved = p.IsTechnicalSheetApproved,
                approvedAt = p.TechnicalSheetApprovedAt,
                approvedBy = p.TechnicalSheetApprovedBy,
                rejectionReason = p.TechnicalSheetRejectionReason
            })
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("{partId:guid}")]
    public async Task<ActionResult<object>> GetByPartId(Guid partId)
    {
        var part = await _context.OrderParts
            .AsNoTracking()
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.Id == partId);

        if (part == null || part.Order == null)
        {
            return NotFound();
        }

        var ampliacionesUrls = FilterAttachmentPublicUrls(part.AdjuntosJson, "ampliaciones", "ampliacion");
        var adjuntosUrls = FilterAttachmentPublicUrls(part.AdjuntosJson, "adjuntos", "adjunto");

        return Ok(new
        {
            id = part.Id,
            orderId = part.ProductionOrderId,
            otNumber = part.Order.OTNumber,
            cliente = part.Order.Cliente,
            ejecutivo = part.Order.EjecutivoCuenta,
            linea = part.Order.LineaPT,
            producto = part.Order.ProductName,
            pieza = part.PartName,
            codigoSap = part.Order.ProductCode,
            fechaSolicitud = part.Order.FechaSolicitud,
            asignacion = part.Order.Asignacion,
            cabida = part.Cabida,
            altoPliego = part.AltoPliego,
            anchoPliego = part.AnchoPliego,
            ampliacionesUrls,
            adjuntosUrls,
            sustratoSup = part.SustratoSup,
            sustratoMed = part.SustratoMed,
            sustratoInf = part.SustratoInf,
            direccionFibra = part.DireccionFibra,
            tipoFlauta = part.TipoFlauta,
            direccionFlauta = part.DireccionFlauta,
            medidas = new
            {
                alto = part.Alto,
                largo = part.Largo,
                ancho = part.Ancho,
                fuelle = part.Fuelle
            },
            troquelNuevo = part.TroquelNuevo,
            codigoTroq = part.CodigoTroquel,
            tintas = new
            {
                c = part.TintaC,
                m = part.TintaM,
                y = part.TintaY,
                k = part.TintaK,
                especiales = part.TintasEspeciales
            },
            terminados = new
            {
                t1 = part.Terminado1,
                t2 = part.Terminado2,
                estampado = part.Estampado,
                pieImprenta = part.PieImprenta,
                tipoManija = part.ManijaTipo,
                mRef = part.ManijaRef,
                mLargo = part.ManijaLargo
            },
            notas = part.Notas,
            approved = part.IsTechnicalSheetApproved,
            approvedAt = part.TechnicalSheetApprovedAt,
            approvedBy = part.TechnicalSheetApprovedBy,
            fechaCreacion = part.Order.CreatedAt,
            fechaActualizacion = part.Order.UpdatedAt
        });
    }

    [HttpPut("{partId:guid}/approval")]
    public async Task<ActionResult<object>> SetApproval(Guid partId, [FromBody] SetTechnicalSheetApprovalRequest request)
    {
        var part = await _context.OrderParts
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.Id == partId);

        if (part == null || part.Order == null)
        {
            return NotFound();
        }

        if (request.Approved)
        {
            part.IsTechnicalSheetApproved = true;
            part.EstadoAprobacion = "Aprobado";
            part.EstadoFicha = "OK";
            part.TechnicalSheetApprovedAt = DateTime.UtcNow;
            part.TechnicalSheetApprovedBy = User.Identity?.Name ?? "Sistema";
            part.TechnicalSheetRejectionReason = null;
        }
        else
        {
            var motivo = (request.RejectionReason ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(motivo))
                return BadRequest(new { message = "Debe indicar el motivo para desaprobar la ficha técnica." });
            if (motivo.Length > 2000)
                return BadRequest(new { message = "El motivo no puede superar 2000 caracteres." });

            part.IsTechnicalSheetApproved = false;
            part.EstadoAprobacion = "Rechazado";
            part.EstadoFicha = "Pendiente";
            part.TechnicalSheetApprovedAt = null;
            part.TechnicalSheetApprovedBy = null;
            part.TechnicalSheetRejectionReason = motivo;
        }

        await _context.SaveChangesAsync();

        string auditDetail;
        if (request.Approved)
        {
            auditDetail = "aprobada";
        }
        else
        {
            var reason = part.TechnicalSheetRejectionReason ?? string.Empty;
            var reasonShort = reason.Length > 500 ? reason[..500] + "…" : reason;
            auditDetail = $"desaprobada. Motivo: {reasonShort}";
        }

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            request.Approved ? "APPROVE_TECHNICAL_SHEET" : "UNAPPROVE_TECHNICAL_SHEET",
            $"Ficha técnica OT {part.Order.OTNumber} ({part.PartName}) {auditDetail}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"
        );

        return Ok(new
        {
            id = part.Id,
            approved = part.IsTechnicalSheetApproved,
            approvedAt = part.TechnicalSheetApprovedAt,
            approvedBy = part.TechnicalSheetApprovedBy,
            rejectionReason = part.TechnicalSheetRejectionReason
        });
    }

    public sealed class SetTechnicalSheetApprovalRequest
    {
        public bool Approved { get; set; }
        public string? RejectionReason { get; set; }
    }

    /// <summary>Filtra URLs públicas de adjuntos por categoría o kind guardados en AdjuntosJson.</summary>
    private static List<string> FilterAttachmentPublicUrls(string? adjuntosJson, string categoryMatch, string kindMatch)
    {
        var result = new List<string>();
        if (string.IsNullOrWhiteSpace(adjuntosJson) || adjuntosJson == "[]")
            return result;

        try
        {
            using var doc = JsonDocument.Parse(adjuntosJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
                return result;

            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var cat = el.TryGetProperty("category", out var cEl) && cEl.ValueKind == JsonValueKind.String
                    ? cEl.GetString()
                    : null;
                var kind = el.TryGetProperty("kind", out var kEl) && kEl.ValueKind == JsonValueKind.String
                    ? kEl.GetString()
                    : null;
                var url = el.TryGetProperty("publicUrl", out var uEl) && uEl.ValueKind == JsonValueKind.String
                    ? uEl.GetString()
                    : null;
                if (string.IsNullOrWhiteSpace(url))
                    continue;

                var matchCat = !string.IsNullOrEmpty(cat) &&
                    string.Equals(cat, categoryMatch, StringComparison.OrdinalIgnoreCase);
                var matchKind = !string.IsNullOrEmpty(kind) &&
                    string.Equals(kind, kindMatch, StringComparison.OrdinalIgnoreCase);
                if (matchCat || matchKind)
                    result.Add(url);
            }
        }
        catch
        {
            // ignorar JSON inválido
        }

        return result;
    }
}
