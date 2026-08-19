using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/gastos/{area}")]
public sealed class AreaExpenseCatalogController : ControllerBase
{
    private static readonly HashSet<string> Areas = new(StringComparer.OrdinalIgnoreCase)
    {
        "produccion", "planeacion", "talleres", "diseno", "gestion-humana", "mantenimiento"
    };

    private readonly ProductionDbContext _db;

    public AreaExpenseCatalogController(ProductionDbContext db)
    {
        _db = db;
    }

    [HttpGet("rubros")]
    public async Task<ActionResult> GetRubros(string area, CancellationToken ct)
    {
        if (!TryNormalizeArea(area, out var key)) return BadRequest("Area invalida.");
        await EnsureDefaultRubrosAsync(key, ct);
        var rows = await _db.AreaExpenseRubros.AsNoTracking()
            .Where(r => r.Area == key)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new { id = r.Id, name = r.Name, sortOrder = r.SortOrder })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("rubros")]
    public async Task<ActionResult> CreateRubro(string area, [FromBody] NameRequest request, CancellationToken ct)
    {
        if (!TryNormalizeArea(area, out var key)) return BadRequest("Area invalida.");
        var name = Title(request.Name);
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("El nombre del rubro es obligatorio.");
        if (await _db.AreaExpenseRubros.AnyAsync(r => r.Area == key && r.Name == name, ct))
            return Conflict("Ya existe un rubro con ese nombre.");

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
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.InnerException?.Message ?? ex.Message);
        }
        return Ok(new { id = entity.Id, name = entity.Name, sortOrder = entity.SortOrder });
    }

    [HttpPost("rubros/{id:guid}")]
    [HttpPut("rubros/{id:guid}")]
    public async Task<ActionResult> UpdateRubro(string area, Guid id, [FromBody] NameRequest request, CancellationToken ct)
    {
        if (!TryNormalizeArea(area, out var key)) return BadRequest("Area invalida.");
        var entity = await _db.AreaExpenseRubros.FirstOrDefaultAsync(r => r.Id == id && r.Area == key, ct);
        if (entity is null) return NotFound();
        var name = Title(request.Name);
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("El nombre del rubro es obligatorio.");
        if (await _db.AreaExpenseRubros.AnyAsync(r => r.Area == key && r.Name == name && r.Id != id, ct))
            return Conflict("Ya existe un rubro con ese nombre.");
        entity.Name = name;
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.InnerException?.Message ?? ex.Message);
        }
        return Ok(new { id = entity.Id, name = entity.Name, sortOrder = entity.SortOrder });
    }

    [HttpDelete("rubros/{id:guid}")]
    public async Task<IActionResult> DeleteRubro(string area, Guid id, CancellationToken ct)
    {
        if (!TryNormalizeArea(area, out var key)) return BadRequest("Area invalida.");
        var entity = await _db.AreaExpenseRubros.FirstOrDefaultAsync(r => r.Id == id && r.Area == key, ct);
        if (entity is null) return NotFound();
        _db.AreaExpenseRubros.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("proveedores")]
    public async Task<ActionResult> GetProveedores(string area, CancellationToken ct)
    {
        if (!TryNormalizeArea(area, out var key)) return BadRequest("Area invalida.");
        var rows = await _db.AreaExpenseProveedores.AsNoTracking()
            .Where(p => p.Area == key)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);
        return Ok(rows.Select(MapProveedor));
    }

    [HttpPost("proveedores")]
    public async Task<ActionResult> CreateProveedor(string area, [FromBody] ProveedorRequest request, CancellationToken ct)
    {
        if (!TryNormalizeArea(area, out var key)) return BadRequest("Area invalida.");
        var name = Title(request.Name);
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("El nombre del proveedor es obligatorio.");
        var rubros = NormalizeRubros(request.Rubros);
        if (rubros.Count == 0) return BadRequest("Seleccione al menos un rubro.");
        if (!TryNormalizeIds(rubros, request.Nit, request.Cedula, out var nit, out var cedula, out var idError))
            return BadRequest(idError);

        var entity = new AreaExpenseProveedor
        {
            Id = Guid.NewGuid(),
            Area = key,
            Name = name,
            Nit = nit,
            Cedula = cedula,
            Telefono = NullIfEmpty(request.Telefono),
            Asesor = Title(request.Asesor),
            RubrosJson = JsonSerializer.Serialize(rubros),
            CreatedAt = DateTime.UtcNow
        };
        _db.AreaExpenseProveedores.Add(entity);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.InnerException?.Message ?? ex.Message);
        }
        return Ok(MapProveedor(entity));
    }

    [HttpPost("proveedores/{id:guid}")]
    [HttpPut("proveedores/{id:guid}")]
    public async Task<ActionResult> UpdateProveedor(string area, Guid id, [FromBody] ProveedorRequest request, CancellationToken ct)
    {
        if (!TryNormalizeArea(area, out var key)) return BadRequest("Area invalida.");
        var entity = await _db.AreaExpenseProveedores.FirstOrDefaultAsync(p => p.Id == id && p.Area == key, ct);
        if (entity is null) return NotFound();
        var name = Title(request.Name);
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("El nombre del proveedor es obligatorio.");
        var rubros = NormalizeRubros(request.Rubros);
        if (rubros.Count == 0) return BadRequest("Seleccione al menos un rubro.");
        if (!TryNormalizeIds(rubros, request.Nit, request.Cedula, out var nit, out var cedula, out var idError))
            return BadRequest(idError);
        entity.Name = name;
        entity.Nit = nit;
        entity.Cedula = cedula;
        entity.Telefono = NullIfEmpty(request.Telefono);
        entity.Asesor = Title(request.Asesor);
        entity.RubrosJson = JsonSerializer.Serialize(rubros);
        entity.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.InnerException?.Message ?? ex.Message);
        }
        return Ok(MapProveedor(entity));
    }

    [HttpDelete("proveedores/{id:guid}")]
    public async Task<IActionResult> DeleteProveedor(string area, Guid id, CancellationToken ct)
    {
        if (!TryNormalizeArea(area, out var key)) return BadRequest("Area invalida.");
        var entity = await _db.AreaExpenseProveedores.FirstOrDefaultAsync(p => p.Id == id && p.Area == key, ct);
        if (entity is null) return NotFound();
        _db.AreaExpenseProveedores.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task EnsureDefaultRubrosAsync(string area, CancellationToken ct)
    {
        if (await _db.AreaExpenseRubros.AnyAsync(r => r.Area == area, ct))
            return;

        string[] defaults = area switch
        {
            "mantenimiento" => ["Ferreteria", "Lubricacion", "Mantenimiento", "Repuestos", "Rodamientos", "Sistema Aire"],
            _ => ["Horas Extras", "Mantenimiento", "Repuesto", "Refrigerios", "Recargo", "Prestadores De Servicios"]
        };

        var order = 1;
        foreach (var name in defaults)
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

        await _db.SaveChangesAsync(ct);
    }

    private static object MapProveedor(AreaExpenseProveedor p)
    {
        var rubros = ParseRubros(p.RubrosJson);
        return new
        {
            id = p.Id,
            name = p.Name,
            nit = p.Nit,
            cedula = p.Cedula,
            telefono = p.Telefono,
            asesor = p.Asesor,
            rubros,
            rubro = rubros.FirstOrDefault() ?? ""
        };
    }

    private static List<string> ParseRubros(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json)?
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(Title)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList() ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static List<string> NormalizeRubros(IReadOnlyList<string>? rubros) =>
        (rubros ?? [])
            .Select(Title)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static bool TryNormalizeIds(
        IReadOnlyList<string> rubros,
        string? nitRaw,
        string? cedulaRaw,
        out string? nit,
        out string? cedula,
        out string error)
    {
        nit = null;
        cedula = null;
        error = "";

        if (!TryFormatNit(nitRaw, out nit, out var nitError))
        {
            error = nitError;
            return false;
        }

        if (!TryFormatCedula(cedulaRaw, out cedula, out var ccError))
        {
            error = ccError;
            return false;
        }

        return true;
    }

    private static bool TryFormatNit(string? value, out string? formatted, out string error)
    {
        formatted = null;
        error = "";
        var digits = DigitsOnly(value);
        if (digits.Length == 0) return true;
        if (digits.Length != 10)
        {
            error = "El NIT debe tener 9 dígitos y un dígito de verificación (ej. 900.123.456-7).";
            return false;
        }
        formatted = $"{digits[..3]}.{digits[3..6]}.{digits[6..9]}-{digits[9..]}";
        return true;
    }

    private static bool TryFormatCedula(string? value, out string? formatted, out string error)
    {
        formatted = null;
        error = "";
        var digits = DigitsOnly(value);
        if (digits.Length == 0) return true;
        if (digits.Length is < 6 or > 10)
        {
            error = "La C.C. debe tener entre 6 y 10 dígitos.";
            return false;
        }
        formatted = FormatThousands(digits);
        return true;
    }

    private static string FormatThousands(string digits)
    {
        var chars = new List<char>();
        for (var i = 0; i < digits.Length; i++)
        {
            if (i > 0 && (digits.Length - i) % 3 == 0) chars.Add('.');
            chars.Add(digits[i]);
        }
        return new string(chars.ToArray());
    }

    private static string DigitsOnly(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "" : new string(value.Where(char.IsDigit).ToArray());

    private static bool TryNormalizeArea(string? area, out string key)
    {
        key = (area ?? "").Trim().ToLowerInvariant();
        return Areas.Contains(key);
    }

    private static string Title(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var parts = value.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts.Select(p =>
        {
            var lower = p.ToLowerInvariant();
            return char.ToUpperInvariant(lower[0]) + lower[1..];
        }));
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public record NameRequest(string? Name);
    public record ProveedorRequest(string? Name, string? Nit, string? Cedula, string? Telefono, string? Asesor, List<string>? Rubros);
}