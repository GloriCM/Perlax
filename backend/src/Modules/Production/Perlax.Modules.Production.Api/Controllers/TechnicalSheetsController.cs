using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.TechnicalSheets;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/technical-sheets")]
public class TechnicalSheetsController : ControllerBase
{
    private readonly ITechnicalSheetService _sheets;
    private readonly IAuditService _auditService;

    public TechnicalSheetsController(ITechnicalSheetService sheets, IAuditService auditService)
    {
        _sheets = sheets;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetList([FromQuery] string? q = null, CancellationToken ct = default)
    {
        var data = await _sheets.ListAsync(q, ct);
        return Ok(data.Select(p => new
        {
            id = p.Id,
            productionOrderId = p.ProductionOrderId,
            orderId = p.OrderId,
            otNumber = p.OtNumber,
            pieza = p.Pieza,
            cliente = p.Cliente,
            productName = p.ProductName,
            codigoTroquel = p.CodigoTroquel,
            productCode = p.ProductCode,
            approved = p.Approved,
            approvedAt = p.ApprovedAt,
            approvedBy = p.ApprovedBy,
            rejectionReason = p.RejectionReason
        }));
    }

    [HttpGet("{partId:guid}")]
    public async Task<ActionResult<object>> GetByPartId(Guid partId, CancellationToken ct)
    {
        try
        {
            var part = await _sheets.GetByPartIdAsync(partId, ct);
            return Ok(new
            {
                id = part.Id,
                orderId = part.OrderId,
                otNumber = part.OtNumber,
                cliente = part.Cliente,
                ejecutivo = part.Ejecutivo,
                linea = part.Linea,
                producto = part.Producto,
                pieza = part.Pieza,
                codigoSap = part.CodigoSap,
                fechaSolicitud = part.FechaSolicitud,
                asignacion = part.Asignacion,
                cabida = part.Cabida,
                altoPliego = part.AltoPliego,
                anchoPliego = part.AnchoPliego,
                ampliacionesUrls = part.AmpliacionesUrls,
                adjuntosUrls = part.AdjuntosUrls,
                sustratoSup = part.SustratoSup,
                sustratoMed = part.SustratoMed,
                sustratoInf = part.SustratoInf,
                direccionFibra = part.DireccionFibra,
                tipoFlauta = part.TipoFlauta,
                direccionFlauta = part.DireccionFlauta,
                medidas = new { alto = part.Alto, largo = part.Largo, ancho = part.Ancho, fuelle = part.Fuelle },
                troquelNuevo = part.TroquelNuevo,
                codigoTroq = part.CodigoTroq,
                tintas = new { c = part.TintaC, m = part.TintaM, y = part.TintaY, k = part.TintaK, especiales = part.TintasEspeciales },
                terminados = new
                {
                    t1 = part.Terminado1,
                    t2 = part.Terminado2,
                    estampado = part.Estampado,
                    pieImprenta = part.PieImprenta,
                    tipoManija = part.TipoManija,
                    mRef = part.MRef,
                    mLargo = part.MLargo
                },
                notas = part.Notas,
                approved = part.Approved,
                approvedAt = part.ApprovedAt,
                approvedBy = part.ApprovedBy,
                fechaCreacion = part.FechaCreacion,
                fechaActualizacion = part.FechaActualizacion
            });
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPut("{partId:guid}/approval")]
    public async Task<ActionResult<object>> SetApproval(Guid partId, [FromBody] SetTechnicalSheetApprovalRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _sheets.SetApprovalAsync(
                partId, request.Approved, request.RejectionReason, User.Identity?.Name ?? "Sistema", ct);

            string auditDetail;
            if (result.Approved) auditDetail = "aprobada";
            else
            {
                var reason = result.RejectionReason ?? string.Empty;
                var reasonShort = reason.Length > 500 ? reason[..500] + "…" : reason;
                auditDetail = $"desaprobada. Motivo: {reasonShort}";
            }

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name,
                request.Approved ? "APPROVE_TECHNICAL_SHEET" : "UNAPPROVE_TECHNICAL_SHEET",
                $"Ficha tecnica OT {result.OtNumber} ({result.PartName}) {auditDetail}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(new
            {
                id = result.Id,
                approved = result.Approved,
                approvedAt = result.ApprovedAt,
                approvedBy = result.ApprovedBy,
                rejectionReason = result.RejectionReason
            });
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{partId:guid}")]
    public async Task<ActionResult> Delete(Guid partId, CancellationToken ct)
    {
        try
        {
            await _sheets.DeleteAsync(partId, User.Identity?.Name ?? "Sistema", ct);
            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name,
                "DELETE_TECHNICAL_SHEET",
                $"Se eliminó ficha técnica {partId}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    public sealed class SetTechnicalSheetApprovalRequest
    {
        public bool Approved { get; set; }
        public string? RejectionReason { get; set; }
    }
}