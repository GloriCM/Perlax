using System.Text.Json;

namespace Perlax.Modules.Users.Api;

/// <summary>
/// Serialización y reglas de <see cref="Perlax.Modules.Users.Domain.Entities.User.AllowedRoutesJson"/>.
/// null en BD = usuario no administrador sin lista explícita (acceso completo, compatibilidad).
/// "[]" = solo inicio; JSON con paths = lista blanca.
/// </summary>
public static class AllowedRoutesPolicy
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public static string? SerializeForUserRole(string role, string[]? allowedRoutes)
    {
        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return null;

        var routes = allowedRoutes ?? Array.Empty<string>();
        var normalized = routes
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r.Trim())
            .Where(r => r.StartsWith('/'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return JsonSerializer.Serialize(normalized, JsonOpts);
    }

    /// <summary>Para respuestas API y login: null = sin restricción; [] = solo dashboard.</summary>
    public static string[]? DeserializeForResponse(string role, string? json)
    {
        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return null;

        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            return JsonSerializer.Deserialize<string[]>(json, JsonOpts) ?? Array.Empty<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }
}
