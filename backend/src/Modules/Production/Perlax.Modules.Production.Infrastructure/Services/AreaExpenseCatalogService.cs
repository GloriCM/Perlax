using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.AreaExpense;
using Perlax.Modules.Production.Application.Common;
using Perlax.Modules.Production.Domain.AreaExpense;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class AreaExpenseCatalogService : IAreaExpenseCatalogService
{
    private readonly ProductionDbContext _db;

    public AreaExpenseCatalogService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AreaExpenseRubroDto>> ListRubrosAsync(string area, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        await EnsureDefaultRubrosAsync(key, ct);
        return await _db.AreaExpenseRubros.AsNoTracking()
            .Where(r => r.Area == key)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new AreaExpenseRubroDto(r.Id, r.Name, r.SortOrder))
            .ToListAsync(ct);
    }

    public async Task<AreaExpenseRubroDto> CreateRubroAsync(string area, AreaExpenseNameRequest request, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var name = RequireName(request.Name, "El nombre del rubro es obligatorio.");
        if (await _db.AreaExpenseRubros.AnyAsync(r => r.Area == key && r.Name == name, ct))
            throw new ResourceConflictException("Ya existe un rubro con ese nombre.");

        var max = await _db.AreaExpenseRubros.Where(r => r.Area == key).MaxAsync(r => (int?)r.SortOrder, ct) ?? 0;
        var entity = new AreaExpenseRubro
        {
            Id = Guid.NewGuid(),
            Area = key,
            Name = name,
            SortOrder = max + 1,
            CreatedAt = DateTime.UtcNow
        };
        _db.AreaExpenseRubros.Add(entity);
        await SaveAsync(ct);
        return new AreaExpenseRubroDto(entity.Id, entity.Name, entity.SortOrder);
    }

    public async Task<AreaExpenseRubroDto> UpdateRubroAsync(string area, Guid id, AreaExpenseNameRequest request, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var entity = await _db.AreaExpenseRubros.FirstOrDefaultAsync(r => r.Id == id && r.Area == key, ct)
            ?? throw new KeyNotFoundException();
        var name = RequireName(request.Name, "El nombre del rubro es obligatorio.");
        if (await _db.AreaExpenseRubros.AnyAsync(r => r.Area == key && r.Name == name && r.Id != id, ct))
            throw new ResourceConflictException("Ya existe un rubro con ese nombre.");
        entity.Name = name;
        await SaveAsync(ct);
        return new AreaExpenseRubroDto(entity.Id, entity.Name, entity.SortOrder);
    }

    public async Task DeleteRubroAsync(string area, Guid id, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var entity = await _db.AreaExpenseRubros.FirstOrDefaultAsync(r => r.Id == id && r.Area == key, ct)
            ?? throw new KeyNotFoundException();
        _db.AreaExpenseRubros.Remove(entity);
        await SaveAsync(ct);
    }

    public async Task<IReadOnlyList<AreaExpenseProveedorDto>> ListProveedoresAsync(string area, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var rows = await _db.AreaExpenseProveedores.AsNoTracking()
            .Where(p => p.Area == key)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);
        return rows.Select(MapProveedor).ToList();
    }

    public async Task<AreaExpenseProveedorDto> CreateProveedorAsync(string area, AreaExpenseProveedorRequest request, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var name = RequireName(request.Name, "El nombre del proveedor es obligatorio.");
        var rubros = AreaExpenseCatalogRules.NormalizeRubros(request.Rubros);
        if (rubros.Count == 0)
            throw new InvalidOperationException("Seleccione al menos un rubro.");
        var (nit, cedula) = RequireIds(request.Nit, request.Cedula);

        var entity = new AreaExpenseProveedor
        {
            Id = Guid.NewGuid(),
            Area = key,
            Name = name,
            Nit = nit,
            Cedula = cedula,
            Telefono = AreaExpenseCatalogRules.NullIfEmpty(request.Telefono),
            Asesor = AreaExpenseCatalogRules.Title(request.Asesor),
            RubrosJson = JsonSerializer.Serialize(rubros),
            CreatedAt = DateTime.UtcNow
        };
        _db.AreaExpenseProveedores.Add(entity);
        await SaveAsync(ct);
        return MapProveedor(entity);
    }

    public async Task<AreaExpenseProveedorDto> UpdateProveedorAsync(string area, Guid id, AreaExpenseProveedorRequest request, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var entity = await _db.AreaExpenseProveedores.FirstOrDefaultAsync(p => p.Id == id && p.Area == key, ct)
            ?? throw new KeyNotFoundException();
        var name = RequireName(request.Name, "El nombre del proveedor es obligatorio.");
        var rubros = AreaExpenseCatalogRules.NormalizeRubros(request.Rubros);
        if (rubros.Count == 0)
            throw new InvalidOperationException("Seleccione al menos un rubro.");
        var (nit, cedula) = RequireIds(request.Nit, request.Cedula);
        entity.Name = name;
        entity.Nit = nit;
        entity.Cedula = cedula;
        entity.Telefono = AreaExpenseCatalogRules.NullIfEmpty(request.Telefono);
        entity.Asesor = AreaExpenseCatalogRules.Title(request.Asesor);
        entity.RubrosJson = JsonSerializer.Serialize(rubros);
        entity.UpdatedAt = DateTime.UtcNow;
        await SaveAsync(ct);
        return MapProveedor(entity);
    }

    public async Task DeleteProveedorAsync(string area, Guid id, CancellationToken ct = default)
    {
        var key = RequireArea(area);
        var entity = await _db.AreaExpenseProveedores.FirstOrDefaultAsync(p => p.Id == id && p.Area == key, ct)
            ?? throw new KeyNotFoundException();
        _db.AreaExpenseProveedores.Remove(entity);
        await SaveAsync(ct);
    }

    private async Task EnsureDefaultRubrosAsync(string area, CancellationToken ct)
    {
        if (await _db.AreaExpenseRubros.AnyAsync(r => r.Area == area, ct))
            return;

        var order = 1;
        foreach (var name in AreaExpenseCatalogRules.DefaultRubros(area))
        {
            _db.AreaExpenseRubros.Add(new AreaExpenseRubro
            {
                Id = Guid.NewGuid(),
                Area = area,
                Name = name,
                SortOrder = order++,
                CreatedAt = DateTime.UtcNow
            });
        }

        await SaveAsync(ct);
    }

    private static AreaExpenseProveedorDto MapProveedor(AreaExpenseProveedor p)
    {
        var rubros = ParseRubros(p.RubrosJson);
        return new AreaExpenseProveedorDto(
            p.Id, p.Name, p.Nit, p.Cedula, p.Telefono, p.Asesor, rubros, rubros.FirstOrDefault() ?? "");
    }

    private static List<string> ParseRubros(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json)?
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(AreaExpenseCatalogRules.Title)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList() ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static string RequireArea(string area)
    {
        if (!AreaExpenseCatalogRules.TryNormalizeArea(area, out var key))
            throw new InvalidOperationException("Area invalida.");
        return key;
    }

    private static string RequireName(string? value, string message)
    {
        var name = AreaExpenseCatalogRules.Title(value);
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException(message);
        return name;
    }

    private static (string? Nit, string? Cedula) RequireIds(string? nitRaw, string? cedulaRaw)
    {
        if (!AreaExpenseCatalogRules.TryFormatNit(nitRaw, out var nit, out var nitError))
            throw new InvalidOperationException(nitError);
        if (!AreaExpenseCatalogRules.TryFormatCedula(cedulaRaw, out var cedula, out var ccError))
            throw new InvalidOperationException(ccError);
        return (nit, cedula);
    }

    private async Task SaveAsync(CancellationToken ct)
    {
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(ex.InnerException?.Message ?? ex.Message);
        }
    }
}