namespace Perlax.Modules.Users.Domain.Entities;

/// <summary>
/// Roles de usuario. El personal de planta/apoyo se usa para horas extras por área.
/// Administrador no registra horas extras.
/// </summary>
public static class UserRoles
{
    public const string Administrador = "Administrador";
    public const string Administrativo = "Administrativo";
    public const string Operario = "Operario";
    public const string Auxiliar = "Auxiliar";
    public const string Almacen = "Almacen";
    public const string Taller = "Taller";

    public static bool IsAdmin(string? role) =>
        string.Equals(role, Administrador, StringComparison.OrdinalIgnoreCase)
        || string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);

    public static bool IsAdministrative(string? role) =>
        string.Equals(role, Administrativo, StringComparison.OrdinalIgnoreCase)
        || string.Equals(role, "User", StringComparison.OrdinalIgnoreCase);

    public static bool IsOperario(string? role) =>
        string.Equals(role, Operario, StringComparison.OrdinalIgnoreCase);

    public static bool IsAuxiliar(string? role) =>
        string.Equals(role, Auxiliar, StringComparison.OrdinalIgnoreCase);

    public static bool IsAlmacen(string? role) =>
        string.Equals(role, Almacen, StringComparison.OrdinalIgnoreCase)
        || string.Equals(role, "Almacén", StringComparison.OrdinalIgnoreCase);

    public static bool IsTaller(string? role) =>
        string.Equals(role, Taller, StringComparison.OrdinalIgnoreCase);

    /// <summary>Operario, auxiliar, almacén y taller: personal de apoyo (horas extras por área).</summary>
    public static bool IsShopFloor(string? role) =>
        IsOperario(role) || IsAuxiliar(role) || IsAlmacen(role) || IsTaller(role);

    /// <summary>Roles que usan matriz de módulos/vistas (Administrativo y Taller con acceso ERP).</summary>
    public static bool UsesViewMatrix(string? role) =>
        IsAdministrative(role) || IsTaller(role);

    /// <summary>Personal de planta sin menú ERP (fuerza rutas vacías).</summary>
    public static bool ForcesEmptyRoutes(string? role) =>
        IsShopFloor(role) && !IsTaller(role);

    /// <summary>Solo operarios se eligen en /planta.</summary>
    public static bool AppearsInPlanta(string? role) => IsOperario(role);

    /// <summary>Todos excepto administrador.</summary>
    public static bool HasOvertime(string? role) => !string.IsNullOrWhiteSpace(role) && !IsAdmin(role);

    public static bool IsValid(string? role) =>
        IsAdmin(role) || IsAdministrative(role) || IsShopFloor(role);

    public static string Normalize(string? role)
    {
        var trimmed = (role ?? string.Empty).Trim();
        if (IsAdmin(trimmed)) return Administrador;
        if (IsOperario(trimmed)) return Operario;
        if (IsAuxiliar(trimmed)) return Auxiliar;
        if (IsAlmacen(trimmed)) return Almacen;
        if (IsTaller(trimmed)) return Taller;
        return Administrativo;
    }

    public static string? DefaultArea(string role)
    {
        if (IsOperario(role) || IsAuxiliar(role)) return "produccion";
        if (IsAlmacen(role)) return "planeaccion";
        if (IsTaller(role)) return "talleres";
        return null;
    }

    /// <summary>Área de gastos donde se contabilizan las horas extras de ese rol.</summary>
    public static string OvertimeExpenseArea(string role) => role switch
    {
        _ when IsOperario(role) || IsAuxiliar(role) => "produccion",
        _ when IsAlmacen(role) => "planeacion",
        _ when IsTaller(role) => "talleres",
        _ => "administrativo"
    };

    public static string OvertimeExpenseLabel(string role) => OvertimeExpenseArea(role) switch
    {
        "produccion" => "Producción (Control de Gastos / Personal)",
        "planeacion" => "Planeación (Gastos de Planeación)",
        "talleres" => "Talleres (Control de Personal)",
        _ => "Área del usuario"
    };
}
