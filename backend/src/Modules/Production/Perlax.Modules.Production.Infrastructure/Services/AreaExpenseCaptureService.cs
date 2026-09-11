using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.AreaExpense;
using Perlax.Modules.Production.Domain.AreaExpense;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class AreaExpenseCaptureService : IAreaExpenseCaptureService
{
    private const decimal IvaRate = 0.19m;
    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "pendiente", "gastado"
    };

    private readonly ProductionDbContext _db;

    public AreaExpenseCaptureService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AreaExpenseCapturaDto>> ListAsync(
        string area,
        int? year = null,
        int? month = null,
        string? rubro = null,
        string? status = null,
        CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var query = _db.AreaExpenseCapturas.AsNoTracking().Where(x => x.Area == key);

        if (year is >= 2000 and <= 2100)
            query = query.Where(x => x.ExpenseDate.Year == year.Value);
        if (month is >= 1 and <= 12)
            query = query.Where(x => x.ExpenseDate.Month == month.Value);

        var rubroName = AreaExpenseCatalogRules.Title(rubro);
        if (!string.IsNullOrWhiteSpace(rubroName)
            && !rubroName.Equals("Todos Los Rubros", StringComparison.OrdinalIgnoreCase)
            && !rubroName.Equals("Todos los Rubros", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.RubroName == rubroName);
        }

        if (!string.IsNullOrWhiteSpace(status) && AllowedStatuses.Contains(status.Trim()))
            query = query.Where(x => x.Status == status.Trim().ToLowerInvariant());

        var rows = await query
            .OrderByDescending(x => x.ExpenseDate)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return rows.Select(Map).ToList();
    }

    public async Task<AreaExpenseCapturaDto> GetAsync(string area, Guid id, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var entity = await _db.AreaExpenseCapturas.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.Area == key, ct)
            ?? throw new KeyNotFoundException();
        return Map(entity);
    }

    public async Task<AreaExpenseCapturaDto> CreateAsync(
        string area, AreaExpenseCapturaRequest request, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var entity = new AreaExpenseCaptura
        {
            Id = Guid.NewGuid(),
            Area = key,
            CreatedAt = DateTime.UtcNow
        };
        await ApplyRequestAsync(entity, request, isCreate: true, ct);
        _db.AreaExpenseCapturas.Add(entity);
        await _db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<AreaExpenseCapturaDto> UpdateAsync(
        string area, Guid id, AreaExpenseCapturaRequest request, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var entity = await _db.AreaExpenseCapturas
            .FirstOrDefaultAsync(x => x.Id == id && x.Area == key, ct)
            ?? throw new KeyNotFoundException();
        await ApplyRequestAsync(entity, request, isCreate: false, ct);
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task DeleteAsync(string area, Guid id, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var entity = await _db.AreaExpenseCapturas
            .FirstOrDefaultAsync(x => x.Id == id && x.Area == key, ct)
            ?? throw new KeyNotFoundException();
        _db.AreaExpenseCapturas.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AreaExpenseCapturaDto>> CreateOvertimeBatchAsync(
        string area,
        AreaExpenseOvertimeBatchRequest request,
        CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var segments = (request.Segments ?? [])
            .Where(s => s.CreatesExpense != false && Number(s.Amount) > 0)
            .ToList();
        if (segments.Count == 0)
            throw new InvalidOperationException("No hay segmentos que generen gasto.");

        var groupId = request.OvertimeGroupId ?? Guid.NewGuid();
        if (request.OvertimeGroupId.HasValue)
        {
            var previous = await _db.AreaExpenseCapturas
                .Where(x => x.Area == key && x.OvertimeGroupId == groupId)
                .ToListAsync(ct);
            _db.AreaExpenseCapturas.RemoveRange(previous);
        }

        var expenseDate = request.ExpenseDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var displayName = AreaExpenseCatalogRules.Title(request.DisplayName) is { Length: > 0 } n
            ? n
            : "Sin Persona";
        var registeredBy = AreaExpenseCatalogRules.NullIfEmpty(request.RegisteredBy) ?? "Sistema";
        var status = NormalizeStatus(request.Status);
        var overtimeJson = JsonSerializer.Serialize(new
        {
            input = request.OvertimeInput,
            note = request.Note,
            displayName,
            opNumber = request.OpNumber
        });

        var created = new List<AreaExpenseCaptura>();
        foreach (var segment in segments)
        {
            var category = AreaExpenseCatalogRules.Title(segment.Category);
            if (string.IsNullOrWhiteSpace(category))
                category = segment.IsHe == false ? "Recargo" : "Horas Extras";

            var baseAmount = RoundMoney(Number(segment.Amount));
            var entity = new AreaExpenseCaptura
            {
                Id = Guid.NewGuid(),
                Area = key,
                ExpenseDate = expenseDate,
                RubroName = category,
                ProveedorName = displayName,
                OpNumber = AreaExpenseCatalogRules.NullIfEmpty(request.OpNumber),
                Description = AreaExpenseCatalogRules.NullIfEmpty(request.Note)
                    ?? $"{segment.Label} ({segment.Hours} h)".Trim(),
                BaseAmount = baseAmount,
                IvaAmount = 0,
                TotalAmount = baseAmount,
                Status = status,
                RegisteredBy = registeredBy,
                OvertimeGroupId = groupId,
                OvertimeJson = overtimeJson,
                CreatedAt = DateTime.UtcNow
            };
            created.Add(entity);
        }

        _db.AreaExpenseCapturas.AddRange(created);
        await _db.SaveChangesAsync(ct);
        return created.Select(Map).ToList();
    }

    public async Task DeleteOvertimeGroupAsync(string area, Guid overtimeGroupId, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var rows = await _db.AreaExpenseCapturas
            .Where(x => x.Area == key && x.OvertimeGroupId == overtimeGroupId)
            .ToListAsync(ct);
        if (rows.Count == 0)
            throw new KeyNotFoundException();
        _db.AreaExpenseCapturas.RemoveRange(rows);
        await _db.SaveChangesAsync(ct);
    }

    private async Task ApplyRequestAsync(
        AreaExpenseCaptura entity,
        AreaExpenseCapturaRequest request,
        bool isCreate,
        CancellationToken ct)
    {
        var rubroName = AreaExpenseCatalogRules.Title(request.RubroName);
        if (request.RubroId.HasValue)
        {
            var rubro = await _db.AreaExpenseRubros.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == request.RubroId && r.Area == entity.Area, ct)
                ?? throw new InvalidOperationException("El rubro indicado no existe en el área.");
            entity.RubroId = rubro.Id;
            rubroName = rubro.Name;
        }
        else
        {
            entity.RubroId = null;
        }

        if (string.IsNullOrWhiteSpace(rubroName))
            throw new InvalidOperationException("El rubro es obligatorio.");

        var proveedorName = AreaExpenseCatalogRules.Title(request.ProveedorName);
        if (request.ProveedorId.HasValue)
        {
            var proveedor = await _db.AreaExpenseProveedores.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == request.ProveedorId && p.Area == entity.Area, ct)
                ?? throw new InvalidOperationException("El proveedor indicado no existe en el área.");
            entity.ProveedorId = proveedor.Id;
            proveedorName = proveedor.Name;
        }
        else
        {
            entity.ProveedorId = null;
        }

        if (string.IsNullOrWhiteSpace(proveedorName))
            proveedorName = "Sin Proveedor";

        var baseAmount = RoundMoney(request.BaseAmount ?? 0);
        if (baseAmount < 0)
            throw new InvalidOperationException("El monto base no puede ser negativo.");

        var isOvertime = IsOvertimeOrSurcharge(rubroName) || request.OvertimeGroupId.HasValue;
        var iva = isOvertime ? 0m : RoundMoney(baseAmount * IvaRate);

        entity.ExpenseDate = request.ExpenseDate ?? (isCreate ? DateOnly.FromDateTime(DateTime.UtcNow) : entity.ExpenseDate);
        entity.RubroName = rubroName;
        entity.ProveedorName = proveedorName;
        entity.Invoice = AreaExpenseCatalogRules.NullIfEmpty(request.Invoice);
        entity.OpNumber = AreaExpenseCatalogRules.NullIfEmpty(request.OpNumber);
        entity.Description = AreaExpenseCatalogRules.NullIfEmpty(request.Description);
        entity.BaseAmount = baseAmount;
        entity.IvaAmount = iva;
        entity.TotalAmount = baseAmount + iva;
        entity.Status = NormalizeStatus(request.Status);
        entity.RegisteredBy = AreaExpenseCatalogRules.NullIfEmpty(request.RegisteredBy) ?? "Sistema";
        entity.OvertimeGroupId = request.OvertimeGroupId;
        entity.OvertimeJson = AreaExpenseCatalogRules.NullIfEmpty(request.OvertimeJson);
    }

    private static string RequireArea(string area)
    {
        if (!AreaExpenseCatalogRules.TryNormalizeArea(area, out var key))
            throw new InvalidOperationException("Área de gastos no válida.");
        return key;
    }

    private static string NormalizeStatus(string? status)
    {
        var value = (status ?? "pendiente").Trim().ToLowerInvariant();
        if (!AllowedStatuses.Contains(value))
            throw new InvalidOperationException("Estado inválido. Use pendiente o gastado.");
        return value;
    }

    private static bool IsOvertimeOrSurcharge(string rubroName)
    {
        var n = rubroName.Normalize(System.Text.NormalizationForm.FormD);
        n = new string(n.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c)
            != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray()).ToLowerInvariant();
        return n.Contains("hora extra") || n.Contains("horas extra") || n.Contains("recargo");
    }

    private static decimal Number(decimal? value) => value ?? 0m;

    private static decimal RoundMoney(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static AreaExpenseCapturaDto Map(AreaExpenseCaptura x) => new(
        x.Id,
        x.Area,
        x.ExpenseDate,
        x.RubroId,
        x.RubroName,
        x.ProveedorId,
        x.ProveedorName,
        x.Invoice,
        x.OpNumber,
        x.Description,
        x.BaseAmount,
        x.IvaAmount,
        x.TotalAmount,
        x.Status,
        x.RegisteredBy,
        x.OvertimeGroupId,
        x.OvertimeJson,
        x.CreatedAt,
        x.UpdatedAt);
}
