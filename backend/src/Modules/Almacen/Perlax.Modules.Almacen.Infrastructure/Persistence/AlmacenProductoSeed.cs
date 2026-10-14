using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Almacen.Domain.Entities;
using Perlax.Modules.Almacen.Infrastructure.Services;

namespace Perlax.Modules.Almacen.Infrastructure.Persistence;

/// <summary>
/// Carga el catálogo de productos de la empresa. No duplica por nombre.
/// Si el producto ya existe, solo corrige la unidad cuando venía abreviada.
/// </summary>
public static class AlmacenProductoSeed
{
    public static async Task ApplyAsync(AlmacenDbContext db, CancellationToken ct = default)
    {
        var rows = ReadRows();
        if (rows.Count == 0)
            return;

        var existing = await db.Productos.ToListAsync(ct);
        var byName = existing.ToDictionary(p => AlmacenCatalog.NormalizeName(p.Nombre), p => p);

        var inserted = 0;
        var unitsFixed = 0;
        foreach (var row in rows)
        {
            var key = AlmacenCatalog.NormalizeName(row.Nombre);
            if (string.IsNullOrEmpty(key))
                continue;

            var unidad = AlmacenCatalog.NormalizeUnidad(row.Unidad, row.Nombre);
            var activo = !IsInactive(row.Nombre);
            if (!byName.TryGetValue(key, out var current))
            {
                var entity = new AlmacenProducto
                {
                    Id = Guid.NewGuid(),
                    Nombre = row.Nombre.Trim(),
                    TipoRequisicionId = ResolveTipo(row.Categoria),
                    Descripcion = SameText(row.Descripcion, row.Nombre) ? null : NullIfEmpty(row.Descripcion),
                    CostoEstandar = row.Costo,
                    UnidadSugerida = unidad,
                    Activo = activo,
                    FechaRegistro = DateTime.UtcNow
                };
                db.Productos.Add(entity);
                byName[key] = entity;
                inserted++;
                continue;
            }

            if (!string.Equals(current.UnidadSugerida, unidad, StringComparison.Ordinal))
            {
                current.UnidadSugerida = unidad;
                unitsFixed++;
            }
        }

        if (inserted > 0 || unitsFixed > 0)
        {
            await db.SaveChangesAsync(ct);
            Console.WriteLine($"Catálogo de almacén: {inserted} productos nuevos, {unitsFixed} unidades corregidas.");
        }
    }

    private static bool IsInactive(string nombre)
    {
        var n = nombre.ToUpperInvariant();
        return n.Contains("INACTIV", StringComparison.Ordinal) || n.Contains("NO USAR", StringComparison.Ordinal);
    }

    private static string ResolveTipo(string? categoria)
    {
        var c = (categoria ?? string.Empty).Trim().ToLowerInvariant();
        if (c.Contains("tinta", StringComparison.Ordinal) || c.Contains("pantone", StringComparison.Ordinal))
            return "pantone";
        if (c.Contains("caja", StringComparison.Ordinal) || c.Contains("empaque", StringComparison.Ordinal))
            return "cajas_empaque";
        if (c.Contains("goma", StringComparison.Ordinal) || c.Contains("adhesiv", StringComparison.Ordinal))
            return "gomas_adhesivos";
        return "consumo_diario";
    }

    private static bool SameText(string? a, string? b) =>
        string.Equals((a ?? string.Empty).Trim(), (b ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase);

    private static string? NullIfEmpty(string? value)
    {
        var t = value?.Trim();
        return string.IsNullOrEmpty(t) ? null : t;
    }

    private static List<SeedRow> ReadRows()
    {
        var assembly = typeof(AlmacenProductoSeed).Assembly;
        using var stream = assembly.GetManifestResourceStream("productos-almacen.csv")
            ?? throw new InvalidOperationException("No está embebido productos-almacen.csv.");
        using var reader = new StreamReader(stream);
        var header = reader.ReadLine();
        if (header == null)
            return [];

        var cols = Split(header);
        var iNombre = IndexOf(cols, "Nombre");
        var iDesc = IndexOf(cols, "Descripcion");
        var iCat = IndexOf(cols, "Categoria");
        var iUnidad = IndexOf(cols, "Unidad");
        var iCosto = IndexOf(cols, "CostoEstandar");
        if (iNombre < 0)
            throw new InvalidOperationException("El catálogo de productos no tiene columna Nombre.");

        var rows = new List<SeedRow>();
        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;
            var cells = Split(line);
            var nombre = Cell(cells, iNombre);
            if (string.IsNullOrWhiteSpace(nombre))
                continue;
            rows.Add(new SeedRow(nombre, Cell(cells, iDesc), Cell(cells, iCat), Cell(cells, iUnidad), ParseCost(Cell(cells, iCosto))));
        }

        return rows;
    }

    private static int IndexOf(IReadOnlyList<string> cols, string name)
    {
        for (var i = 0; i < cols.Count; i++)
        {
            if (string.Equals(cols[i].Trim(), name, StringComparison.OrdinalIgnoreCase))
                return i;
        }
        return -1;
    }

    private static string Cell(IReadOnlyList<string> cells, int index) =>
        index >= 0 && index < cells.Count ? cells[index].Trim() : string.Empty;

    private static List<string> Split(string line)
    {
        var cells = new List<string>();
        var current = new System.Text.StringBuilder();
        var quoted = false;
        foreach (var ch in line)
        {
            if (ch == '"')
            {
                quoted = !quoted;
                continue;
            }
            if (ch == ';' && !quoted)
            {
                cells.Add(current.ToString());
                current.Clear();
                continue;
            }
            current.Append(ch);
        }
        cells.Add(current.ToString());
        return cells;
    }

    private static decimal ParseCost(string raw)
    {
        var s = raw.Trim().Replace(" ", string.Empty);
        if (s.Contains(',') && s.Contains('.'))
            s = s.Replace(".", string.Empty).Replace(',', '.');
        else if (s.Contains(','))
            s = s.Replace(',', '.');
        return decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ? value : 0m;
    }

    private sealed record SeedRow(string Nombre, string Descripcion, string Categoria, string Unidad, decimal Costo);
}
