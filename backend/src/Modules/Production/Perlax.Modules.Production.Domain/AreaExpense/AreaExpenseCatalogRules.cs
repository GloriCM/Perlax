namespace Perlax.Modules.Production.Domain.AreaExpense;

public static class AreaExpenseCatalogRules
{
    public static readonly HashSet<string> Areas = new(StringComparer.OrdinalIgnoreCase)
    {
        "produccion", "planeacion", "talleres", "diseno", "gestion-humana", "mantenimiento", "sst"
    };

    public static bool TryNormalizeArea(string? area, out string key)
    {
        key = (area ?? "").Trim().ToLowerInvariant();
        return Areas.Contains(key);
    }

    public static string Title(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var parts = value.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts.Select(p =>
        {
            var lower = p.ToLowerInvariant();
            return char.ToUpperInvariant(lower[0]) + lower[1..];
        }));
    }

    public static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static List<string> NormalizeRubros(IReadOnlyList<string>? rubros) =>
        (rubros ?? [])
            .Select(Title)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    public static bool TryFormatNit(string? value, out string? formatted, out string error)
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

    public static bool TryFormatCedula(string? value, out string? formatted, out string error)
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

    public static string[] DefaultRubros(string area) => area switch
    {
        "mantenimiento" => ["Ferreteria", "Lubricacion", "Mantenimiento", "Repuestos", "Rodamientos", "Sistema Aire"],
        "sst" =>
        [
            "Capacitacion-Asesorias-Auditorias, Actividades De Bienestar",
            "Higiene Industrial Y Manejo Ambiental",
            "Iluminacion-Infraestructural",
            "Examenes Medicos",
            "Dotacion Y Epp",
            "Entrenamiento Montacargas"
        ],
        _ => ["Horas Extras", "Mantenimiento", "Repuesto", "Refrigerios", "Recargo", "Prestadores De Servicios"]
    };

    private static string DigitsOnly(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "" : new string(value.Where(char.IsDigit).ToArray());

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
}