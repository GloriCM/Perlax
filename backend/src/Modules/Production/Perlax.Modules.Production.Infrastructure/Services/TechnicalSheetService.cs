using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.TechnicalSheets;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class TechnicalSheetService : ITechnicalSheetService
{
    private readonly ProductionDbContext _db;

    public TechnicalSheetService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<TechnicalSheetListItemDto>> ListAsync(string? q = null, CancellationToken ct = default)
    {
        var query = _db.OrderParts.AsNoTracking().Include(p => p.Order).Where(p => p.Order != null);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(p =>
                (p.Order!.OTNumber ?? string.Empty).ToLower().Contains(term) ||
                (p.Order.Cliente ?? string.Empty).ToLower().Contains(term) ||
                (p.Order.ProductName ?? string.Empty).ToLower().Contains(term) ||
                (p.CodigoTroquel ?? string.Empty).ToLower().Contains(term));
        }

        return await query
            .OrderByDescending(p => p.Order!.CreatedAt)
            .Select(p => new TechnicalSheetListItemDto(
                p.Id,
                p.ProductionOrderId,
                p.ProductionOrderId,
                p.Order!.OTNumber,
                p.PartName,
                p.Order.Cliente,
                p.Order.ProductName,
                p.CodigoTroquel,
                p.Order.ProductCode,
                p.IsTechnicalSheetApproved,
                p.TechnicalSheetApprovedAt,
                p.TechnicalSheetApprovedBy,
                p.TechnicalSheetRejectionReason))
            .ToListAsync(ct);
    }

    public async Task<TechnicalSheetDetailDto> GetByPartIdAsync(Guid partId, CancellationToken ct = default)
    {
        var part = await _db.OrderParts.AsNoTracking().Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.Id == partId, ct);

        if (part?.Order == null)
            throw new KeyNotFoundException("Ficha tecnica no encontrada.");

        return new TechnicalSheetDetailDto(
            part.Id,
            part.ProductionOrderId,
            part.Order.OTNumber,
            part.Order.Cliente,
            part.Order.EjecutivoCuenta,
            part.Order.LineaPT,
            part.Order.ProductName,
            part.PartName,
            part.Order.ProductCode,
            part.Order.FechaSolicitud,
            part.Order.Asignacion,
            part.Cabida,
            part.AltoPliego,
            part.AnchoPliego,
            FilterAttachmentPublicUrls(part.AdjuntosJson, "ampliaciones", "ampliacion"),
            FilterAttachmentPublicUrls(part.AdjuntosJson, "adjuntos", "adjunto"),
            part.SustratoSup,
            part.SustratoMed,
            part.SustratoInf,
            part.DireccionFibra,
            part.TipoFlauta,
            part.DireccionFlauta,
            part.Alto,
            part.Largo,
            part.Ancho,
            part.Fuelle,
            part.TroquelNuevo,
            part.CodigoTroquel,
            part.TintaC,
            part.TintaM,
            part.TintaY,
            part.TintaK,
            part.TintasEspeciales,
            part.Terminado1,
            part.Terminado2,
            part.Estampado,
            part.PieImprenta,
            part.ManijaTipo,
            part.ManijaRef,
            part.ManijaLargo,
            part.Notas,
            part.IsTechnicalSheetApproved,
            part.TechnicalSheetApprovedAt,
            part.TechnicalSheetApprovedBy,
            part.Order.CreatedAt,
            part.Order.UpdatedAt);
    }

    public async Task<TechnicalSheetApprovalResultDto> SetApprovalAsync(
        Guid partId, bool approved, string? rejectionReason, string userName, CancellationToken ct = default)
    {
        var part = await _db.OrderParts.Include(p => p.Order).FirstOrDefaultAsync(p => p.Id == partId, ct);
        if (part?.Order == null)
            throw new KeyNotFoundException("Ficha tecnica no encontrada.");

        if (approved)
        {
            part.IsTechnicalSheetApproved = true;
            part.EstadoAprobacion = "Aprobado";
            part.EstadoFicha = "OK";
            part.TechnicalSheetApprovedAt = DateTime.UtcNow;
            part.TechnicalSheetApprovedBy = userName;
            part.TechnicalSheetRejectionReason = null;
        }
        else
        {
            var motivo = (rejectionReason ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(motivo))
                throw new InvalidOperationException("Debe indicar el motivo para desaprobar la ficha tecnica.");
            if (motivo.Length > 2000)
                throw new InvalidOperationException("El motivo no puede superar 2000 caracteres.");

            part.IsTechnicalSheetApproved = false;
            part.EstadoAprobacion = "Rechazado";
            part.EstadoFicha = "Pendiente";
            part.TechnicalSheetApprovedAt = null;
            part.TechnicalSheetApprovedBy = null;
            part.TechnicalSheetRejectionReason = motivo;
        }

        await _db.SaveChangesAsync(ct);

        return new TechnicalSheetApprovalResultDto(
            part.Id,
            part.IsTechnicalSheetApproved,
            part.TechnicalSheetApprovedAt,
            part.TechnicalSheetApprovedBy,
            part.TechnicalSheetRejectionReason,
            part.Order.OTNumber,
            part.PartName);
    }

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
                var cat = el.TryGetProperty("category", out var cEl) && cEl.ValueKind == JsonValueKind.String ? cEl.GetString() : null;
                var kind = el.TryGetProperty("kind", out var kEl) && kEl.ValueKind == JsonValueKind.String ? kEl.GetString() : null;
                var url = el.TryGetProperty("publicUrl", out var uEl) && uEl.ValueKind == JsonValueKind.String ? uEl.GetString() : null;
                if (string.IsNullOrWhiteSpace(url)) continue;

                var matchCat = !string.IsNullOrEmpty(cat) && string.Equals(cat, categoryMatch, StringComparison.OrdinalIgnoreCase);
                var matchKind = !string.IsNullOrEmpty(kind) && string.Equals(kind, kindMatch, StringComparison.OrdinalIgnoreCase);
                if (matchCat || matchKind) result.Add(url);
            }
        }
        catch { }

        return result;
    }
}