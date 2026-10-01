namespace Perlax.Modules.Production.Application.Chat;

public record ChatCallerContext(string Username, string DisplayName, string Role, string? Area);

public static class ChatAccess
{
    public static readonly string[] AreaKeys =
    [
        "calidad",
        "produccion",
        "talleres",
        "planeaccion",
        "diseño",
        "ti",
        "mantenimiento",
        "sst",
        "gestion humana",
        "presupuestos",
        "financiero"
    ];

    public static bool IsAdmin(string? role)
    {
        var r = (role ?? string.Empty).Trim().ToLowerInvariant();
        return r is "admin" or "administrador";
    }

    public static bool IsAdministrative(string? role)
    {
        var r = (role ?? string.Empty).Trim().ToLowerInvariant();
        return r is "administrativo" or "user";
    }

    public static bool IsTaller(string? role)
    {
        var r = (role ?? string.Empty).Trim().ToLowerInvariant();
        return r is "taller";
    }

    /// <summary>
    /// Admin/Administrativo siempre. Taller solo si tiene al menos una vista asignada.
    /// </summary>
    public static bool IsEligible(string? role, int assignedViewsCount = 0)
    {
        if (IsAdmin(role) || IsAdministrative(role)) return true;
        if (IsTaller(role)) return assignedViewsCount > 0;
        return false;
    }

    public static string NormalizeArea(string? area)
    {
        if (string.IsNullOrWhiteSpace(area)) return string.Empty;
        var key = area.Trim().ToLowerInvariant();
        var ascii = key
            .Replace('á', 'a').Replace('é', 'e').Replace('í', 'i')
            .Replace('ó', 'o').Replace('ú', 'u').Replace('ü', 'u');
        if (ascii is "diseno") return "diseño";
        if (ascii is "planeacion") return "planeaccion";
        // Solo área canónica "financiero". Alias legacy: contabilidad / financiera.
        if (key is "contabilidad" or "financiera" || ascii is "contabilidad" or "financiera") return "financiero";
        return key;
    }

    public static bool IsDesignArea(string? area)
    {
        var key = NormalizeArea(area);
        var ascii = key
            .Replace('á', 'a').Replace('é', 'e').Replace('í', 'i')
            .Replace('ó', 'o').Replace('ú', 'u');
        return ascii.Contains("dise", StringComparison.Ordinal);
    }

    public static bool IsKnownArea(string? area)
    {
        var key = NormalizeArea(area);
        return AreaKeys.Any(a => string.Equals(a, key, StringComparison.OrdinalIgnoreCase));
    }

    public static string AreaDisplayName(string? areaKey) => NormalizeArea(areaKey) switch
    {
        "calidad" => "Calidad",
        "produccion" => "Producción",
        "talleres" => "Talleres",
        "planeaccion" => "Planeación",
        "diseño" => "Diseño",
        "ti" => "TI",
        "mantenimiento" => "Mantenimiento",
        "sst" => "SST",
        "gestion humana" => "Gestión Humana",
        "presupuestos" => "Presupuestos",
        "financiero" => "Financiero",
        var key when key.Length > 0 => char.ToUpper(key[0]) + key[1..],
        _ => "Área"
    };
}
