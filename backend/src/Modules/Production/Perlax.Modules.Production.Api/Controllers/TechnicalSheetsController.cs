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
                approvedBy = p.TechnicalSheetApprovedBy
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

        part.IsTechnicalSheetApproved = request.Approved;
        part.EstadoAprobacion = request.Approved ? "Aprobado" : "Pendiente";
        part.EstadoFicha = request.Approved ? "OK" : "Pendiente";
        part.TechnicalSheetApprovedAt = request.Approved ? DateTime.UtcNow : null;
        part.TechnicalSheetApprovedBy = request.Approved ? (User.Identity?.Name ?? "Sistema") : null;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            request.Approved ? "APPROVE_TECHNICAL_SHEET" : "UNAPPROVE_TECHNICAL_SHEET",
            $"Ficha técnica OT {part.Order.OTNumber} ({part.PartName}) {(request.Approved ? "aprobada" : "desaprobada")}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"
        );

        return Ok(new
        {
            id = part.Id,
            approved = part.IsTechnicalSheetApproved,
            approvedAt = part.TechnicalSheetApprovedAt,
            approvedBy = part.TechnicalSheetApprovedBy
        });
    }

    public sealed class SetTechnicalSheetApprovalRequest
    {
        public bool Approved { get; set; }
    }
}
