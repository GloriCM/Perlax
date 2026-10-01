using System.Text.Json;
using System.Text.Json.Serialization;

namespace Perlax.Modules.Budgets.Application.Elliot;

public sealed class ElliotLayoutDto
{
    public List<ElliotLayoutSectionDto> Fixed { get; set; } = new();
    public List<ElliotLayoutSectionDto> Variable { get; set; } = new();
}

public sealed class ElliotLayoutSectionDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    /// <summary>income | payroll | items | commissions</summary>
    public string Kind { get; set; } = "items";
    public int SortOrder { get; set; }
    public List<ElliotLayoutSubgroupDto> Subgroups { get; set; } = new();
}

public sealed class ElliotLayoutSubgroupDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    /// <summary>Para nómina: Admin | Sales | Production | Cooperative (rollup del cálculo).</summary>
    public string? MapsTo { get; set; }
    public int SortOrder { get; set; }
}

public static class ElliotLayoutSerializer
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    public static ElliotLayoutDto Empty() => new();

    public static ElliotLayoutDto Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Empty();
        try
        {
            return JsonSerializer.Deserialize<ElliotLayoutDto>(json, JsonOptions) ?? Empty();
        }
        catch
        {
            return Empty();
        }
    }

    public static string Serialize(ElliotLayoutDto layout) =>
        JsonSerializer.Serialize(layout ?? Empty(), JsonOptions);

    /// <summary>
    /// Si no hay layout guardado pero sí hay datos, arma uno mínimo editable.
    /// </summary>
    public static ElliotLayoutDto InferFromData(
        IEnumerable<string> payrollSections,
        IEnumerable<string> itemGroups,
        IEnumerable<string> commissionGroups,
        bool hasIncomes)
    {
        var layout = Empty();
        var order = 0;
        if (hasIncomes)
        {
            layout.Fixed.Add(new ElliotLayoutSectionDto
            {
                Id = Guid.NewGuid().ToString("N"),
                Title = "Ingresos",
                Kind = "income",
                SortOrder = order++
            });
        }

        var pay = payrollSections.Where(s => !string.IsNullOrWhiteSpace(s)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (pay.Count > 0)
        {
            layout.Fixed.Add(new ElliotLayoutSectionDto
            {
                Id = Guid.NewGuid().ToString("N"),
                Title = "Nómina",
                Kind = "payroll",
                SortOrder = order++,
                Subgroups = pay.Select((s, i) => new ElliotLayoutSubgroupDto
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Key = s,
                    Title = s,
                    MapsTo = NormalizeMapsTo(s),
                    SortOrder = i
                }).ToList()
            });
        }

        var groups = itemGroups.Where(g => !string.IsNullOrWhiteSpace(g)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (groups.Count > 0)
        {
            layout.Fixed.Add(new ElliotLayoutSectionDto
            {
                Id = Guid.NewGuid().ToString("N"),
                Title = "Rubros fijos",
                Kind = "items",
                SortOrder = order++,
                Subgroups = groups.Select((g, i) => new ElliotLayoutSubgroupDto
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Key = g,
                    Title = g,
                    SortOrder = i
                }).ToList()
            });
        }

        var cGroups = commissionGroups.Where(g => !string.IsNullOrWhiteSpace(g)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (cGroups.Count > 0)
        {
            layout.Variable.Add(new ElliotLayoutSectionDto
            {
                Id = Guid.NewGuid().ToString("N"),
                Title = "Comisiones",
                Kind = "commissions",
                SortOrder = 0,
                Subgroups = cGroups.Select((g, i) => new ElliotLayoutSubgroupDto
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Key = g,
                    Title = g,
                    SortOrder = i
                }).ToList()
            });
        }

        return layout;
    }

    public static string NormalizeMapsTo(string? key)
    {
        var k = (key ?? string.Empty).Trim();
        if (k.Equals("Admin", StringComparison.OrdinalIgnoreCase)
            || k.Contains("admin", StringComparison.OrdinalIgnoreCase)
            || k.Contains("administr", StringComparison.OrdinalIgnoreCase))
            return "Admin";
        if (k.Equals("Sales", StringComparison.OrdinalIgnoreCase)
            || k.Contains("venta", StringComparison.OrdinalIgnoreCase)
            || k.Contains("comercial", StringComparison.OrdinalIgnoreCase))
            return "Sales";
        if (k.Equals("Production", StringComparison.OrdinalIgnoreCase)
            || k.Contains("produc", StringComparison.OrdinalIgnoreCase)
            || k.Contains("planta", StringComparison.OrdinalIgnoreCase)
            || k.Contains("mod", StringComparison.OrdinalIgnoreCase))
            return "Production";
        if (k.Equals("Cooperative", StringComparison.OrdinalIgnoreCase)
            || k.Contains("coop", StringComparison.OrdinalIgnoreCase))
            return "Cooperative";
        return "Admin";
    }
}
