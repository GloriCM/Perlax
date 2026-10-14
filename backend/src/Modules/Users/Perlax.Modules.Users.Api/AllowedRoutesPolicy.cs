using System.Text.Json;
using System.Text.Json.Serialization;

namespace Perlax.Modules.Users.Api;

public static class RouteAccess
{
    public const string View = "ver";
    public const string Edit = "editar";
}

/// <summary>Vista del menú y modo: ver (solo consulta) o editar (ver y modificar).</summary>
public sealed record RouteAccessGrant(string Path, string Access);

/// <summary>
/// Serialización de <see cref="Perlax.Modules.Users.Domain.Entities.User.AllowedRoutesJson"/>.
/// null en BD = sin lista explícita (acceso completo). "[]" = solo inicio.
/// Una lista de textos (formato anterior) se lee como editar.
/// El formato actual es un arreglo de { path, access }.
/// </summary>
public static class AllowedRoutesPolicy
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private static bool IsAdminRole(string role) =>
        string.Equals(role, "Administrador", StringComparison.OrdinalIgnoreCase)
        || string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);

    public static bool IsMatrixRole(string? role) =>
        string.Equals(role, "Administrativo", StringComparison.OrdinalIgnoreCase)
        || string.Equals(role, "User", StringComparison.OrdinalIgnoreCase)
        || string.Equals(role, "Taller", StringComparison.OrdinalIgnoreCase);

    public static string? SerializeForUserRole(string role, IReadOnlyList<RouteAccessGrant>? allowedRoutes)
    {
        if (IsAdminRole(role))
            return null;

        var normalized = Normalize(allowedRoutes);
        return JsonSerializer.Serialize(normalized, JsonOpts);
    }

    /// <summary>Para respuestas API y login: null = sin restricción; [] = solo dashboard.</summary>
    public static RouteAccessGrant[]? DeserializeForResponse(string role, string? json)
    {
        if (IsAdminRole(role))
            return null;

        if (string.IsNullOrWhiteSpace(json))
            return null;

        return Parse(json);
    }

    public static RouteAccessGrant[] Parse(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
                return [];

            var list = new List<RouteAccessGrant>();
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                if (el.ValueKind == JsonValueKind.String)
                {
                    var path = NormalizePath(el.GetString());
                    if (path != null)
                        list.Add(new RouteAccessGrant(path, RouteAccess.Edit));
                    continue;
                }

                if (el.ValueKind != JsonValueKind.Object)
                    continue;

                var objectPath = NormalizePath(ReadString(el, "path"));
                if (objectPath == null)
                    continue;
                var access = NormalizeAccess(ReadString(el, "access") ?? ReadString(el, "mode"));
                list.Add(new RouteAccessGrant(objectPath, access));
            }

            return Normalize(list);
        }
        catch (JsonException)
        {
            return [];
        }
    }

    /// <summary>
    /// Rechaza crear, modificar y borrar cuando la vista de la petición es solo ver.
    /// Sin encabezado de vista, usa el mapa de la API: si todas las vistas ligadas son ver, rechaza.
    /// </summary>
    public static bool AllowsWrite(IReadOnlyList<RouteAccessGrant> grants, string apiPath, string? viewHeader)
    {
        var header = NormalizePath(viewHeader);
        if (header != null)
        {
            var headerGrant = Match(grants, header);
            if (headerGrant is { Access: RouteAccess.View })
                return false;

            var mapped = ViewsForApi(apiPath);
            if (mapped.Count == 0)
                return true;

            if (headerGrant is { Access: RouteAccess.Edit } && mapped.Any(view => PathsRelated(header, view)))
                return true;

            if (headerGrant == null)
                return !MappedViewsAreViewOnly(grants, mapped);

            return false;
        }

        var views = ViewsForApi(apiPath);
        if (views.Count == 0)
            return true;

        return !MappedViewsAreViewOnly(grants, views);
    }

    private static bool MappedViewsAreViewOnly(IReadOnlyList<RouteAccessGrant> grants, IReadOnlyList<string> views)
    {
        var saw = false;
        foreach (var view in views)
        {
            var grant = Match(grants, view);
            if (grant == null)
                continue;
            saw = true;
            if (string.Equals(grant.Access, RouteAccess.Edit, StringComparison.OrdinalIgnoreCase))
                return false;
        }

        return saw;
    }

    public static RouteAccessGrant? Match(IReadOnlyList<RouteAccessGrant> grants, string pathname)
    {
        var path = NormalizePath(pathname);
        if (path == null)
            return null;

        if (path == "/fichas/imprimir" || path.StartsWith("/fichas/imprimir/", StringComparison.Ordinal))
            return grants.FirstOrDefault(g => string.Equals(g.Path, "/fichas/lista", StringComparison.OrdinalIgnoreCase));

        RouteAccessGrant? best = null;
        foreach (var grant in grants)
        {
            var basePath = grant.Path;
            var matches = string.Equals(basePath, path, StringComparison.OrdinalIgnoreCase)
                || (basePath != "/" && path.StartsWith(basePath + "/", StringComparison.OrdinalIgnoreCase));
            if (!matches)
                continue;
            if (best == null || basePath.Length > best.Path.Length)
                best = grant;
        }

        if (best == null && string.Equals(path, "/diseno/planeador", StringComparison.OrdinalIgnoreCase))
            best = grants.FirstOrDefault(g => string.Equals(g.Path, "/ordenes/planes-diseno", StringComparison.OrdinalIgnoreCase));

        return best;
    }

    private static bool PathsRelated(string header, string view) =>
        string.Equals(header, view, StringComparison.OrdinalIgnoreCase)
        || header.StartsWith(view + "/", StringComparison.OrdinalIgnoreCase)
        || view.StartsWith(header + "/", StringComparison.OrdinalIgnoreCase);

    public static IReadOnlyList<string> ViewsForApi(string apiPath)
    {
        var path = (apiPath ?? "").Trim();
        if (path.Length > 1 && path.EndsWith('/'))
            path = path[..^1];

        if (path.Contains("/cotizador/calculate", StringComparison.OrdinalIgnoreCase)
            || path.Contains("/validate-costs", StringComparison.OrdinalIgnoreCase))
            return [];

        if (path.StartsWith("/api/production/cotizador/catalogs", StringComparison.OrdinalIgnoreCase))
            return ["/cotizador/catalogos", "/ajustes/cotizador-catalogos"];

        if (path.StartsWith("/api/production/cotizador", StringComparison.OrdinalIgnoreCase))
            return ["/cotizador/nueva", "/cotizador/guardadas", "/cotizador"];

        if (path.StartsWith("/api/design/planner", StringComparison.OrdinalIgnoreCase))
            return ["/diseno/planeador", "/ordenes/planes-diseno"];

        if (path.StartsWith("/api/almacen/requisiciones", StringComparison.OrdinalIgnoreCase)
            && path.Contains("/recepciones", StringComparison.OrdinalIgnoreCase))
            return ["/compras/recepcion"];

        if (path.StartsWith("/api/almacen/requisiciones", StringComparison.OrdinalIgnoreCase)
            && path.Contains("/pedido", StringComparison.OrdinalIgnoreCase))
            return ["/compras/pedidos"];

        if (path.StartsWith("/api/almacen/requisiciones", StringComparison.OrdinalIgnoreCase))
            return ["/compras/requisicion"];

        if (path.StartsWith("/api/almacen/ordenes-compra", StringComparison.OrdinalIgnoreCase))
            return ["/compras/pedidos", "/compras/recepcion"];

        if (path.StartsWith("/api/almacen/productos", StringComparison.OrdinalIgnoreCase))
            return ["/compras/catalogo-productos", "/compras/requisicion", "/compras/pedidos", "/compras/recepcion"];

        if (path.StartsWith("/api/almacen/proveedores", StringComparison.OrdinalIgnoreCase))
            return ["/compras/requisicion", "/compras/pedidos", "/compras/recepcion"];

        if (path.StartsWith("/api/almacen", StringComparison.OrdinalIgnoreCase))
            return ["/compras/requisicion", "/compras/pedidos", "/compras/recepcion", "/compras/consumos"];

        if (path.StartsWith("/api/budgets", StringComparison.OrdinalIgnoreCase))
            return
            [
                "/presupuestos",
                "/presupuestos/produccion",
                "/presupuestos/talleres",
                "/presupuestos/gestion-humana",
                "/presupuestos/sst",
                "/presupuestos/planeacion",
                "/presupuestos/diseno"
            ];

        if (path.StartsWith("/api/production/orders", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/production/quotations", StringComparison.OrdinalIgnoreCase))
            return ["/ordenes/nueva", "/ordenes/lista", "/ordenes/planes-diseno"];

        if (path.StartsWith("/api/production/manufacturing-orders", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/production/scheduling", StringComparison.OrdinalIgnoreCase))
            return ["/ordenes/lista", "/produccion/apertura", "/produccion/op-existente", "/produccion/estado-ordenes", "/planeacion/programador"];

        if (path.StartsWith("/api/production/customer-orders", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/production/customers", StringComparison.OrdinalIgnoreCase))
            return ["/pedidos/nuevo", "/pedidos/informe", "/clientes"];

        if (path.StartsWith("/api/production/inventory", StringComparison.OrdinalIgnoreCase))
            return ["/compras/consumos", "/inventario/existencias", "/inventario/devoluciones"];

        if (path.StartsWith("/api/production/inventario-pt", StringComparison.OrdinalIgnoreCase))
            return ["/inventario/existencias", "/inventario/devoluciones"];

        if (path.StartsWith("/api/production/remisiones", StringComparison.OrdinalIgnoreCase))
            return ["/remisiones/nueva", "/remisiones/informe"];

        if (path.StartsWith("/api/production/facturas", StringComparison.OrdinalIgnoreCase))
            return ["/facturacion/nueva", "/facturacion/informe"];

        if (path.StartsWith("/api/production/technical-sheets", StringComparison.OrdinalIgnoreCase))
            return ["/fichas/lista"];

        if (path.StartsWith("/api/production/daily-reports", StringComparison.OrdinalIgnoreCase))
            return ["/reporte-diario"];

        if (path.StartsWith("/api/gastos/", StringComparison.OrdinalIgnoreCase))
            return ViewsForGastos(path);

        if (path.StartsWith("/api/production/overtime", StringComparison.OrdinalIgnoreCase))
            return
            [
                "/gastos/personal/horas-extra",
                "/gastos/personal/recargo",
                "/gastos/personal/salarios",
                "/talleres-gastos/personal/horas-extra",
                "/talleres-gastos/personal/salarios",
                "/planeacion/personal/horas-extra"
            ];

        return [];
    }

    private static IReadOnlyList<string> ViewsForGastos(string path)
    {
        var rest = path["/api/gastos/".Length..];
        var slash = rest.IndexOf('/');
        var area = slash < 0 ? rest : rest[..slash];
        return area.ToLowerInvariant() switch
        {
            "produccion" => ["/gastos/control/captura", "/gastos/control/rubros", "/gastos/control/cotizaciones", "/gastos/control/proveedores"],
            "talleres" => ["/talleres-gastos/control/captura", "/talleres-gastos/control/rubros", "/talleres-gastos/control/cotizaciones", "/talleres-gastos/control/proveedores"],
            "diseno" or "diseño" => ["/diseno/gastos/captura", "/diseno/gastos/rubros", "/diseno/gastos/cotizaciones", "/diseno/gastos/proveedores"],
            "planeacion" or "planeaccion" => ["/planeacion/gastos/captura", "/planeacion/gastos/rubros", "/planeacion/gastos/cotizaciones", "/planeacion/gastos/proveedores"],
            "gestion-humana" or "gestionhumana" or "ghumana" => ["/gestion-humana/gastos/captura", "/gestion-humana/gastos/rubros", "/gestion-humana/gastos/cotizaciones", "/gestion-humana/gastos/proveedores", "/gestion-humana/gastos/servicios"],
            "sst" => ["/sst/gastos/captura", "/sst/gastos/rubros", "/sst/gastos/cotizaciones", "/sst/gastos/proveedores", "/sst/gastos/servicios", "/sst/orden-aseo"],
            "mantenimiento" => ["/mantenimiento/gastos/captura", "/mantenimiento/gastos/rubros", "/mantenimiento/gastos/cotizaciones", "/mantenimiento/gastos/proveedores", "/mantenimiento/gastos/productos", "/mantenimiento/inventario"],
            _ => []
        };
    }

    private static RouteAccessGrant[] Normalize(IReadOnlyList<RouteAccessGrant>? grants)
    {
        if (grants == null || grants.Count == 0)
            return [];

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var list = new List<RouteAccessGrant>();
        foreach (var grant in grants)
        {
            var path = NormalizePath(grant.Path);
            if (path == null || !seen.Add(path))
                continue;
            list.Add(new RouteAccessGrant(path, NormalizeAccess(grant.Access)));
        }

        return list.ToArray();
    }

    public static string? NormalizePath(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return null;
        var trimmed = path.Trim();
        if (!trimmed.StartsWith('/'))
            return null;
        if (trimmed.Length > 1 && trimmed.EndsWith('/'))
            trimmed = trimmed[..^1];
        return trimmed;
    }

    public static string NormalizeAccess(string? access) =>
        string.Equals(access, RouteAccess.View, StringComparison.OrdinalIgnoreCase) ? RouteAccess.View : RouteAccess.Edit;

    private static string? ReadString(JsonElement obj, string name)
    {
        foreach (var prop in obj.EnumerateObject())
        {
            if (!string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                continue;
            return prop.Value.ValueKind == JsonValueKind.String ? prop.Value.GetString() : null;
        }

        return null;
    }
}

public sealed class RouteAccessGrantArrayConverter : JsonConverter<RouteAccessGrant[]?>
{
    public override RouteAccessGrant[]? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;
        using var doc = JsonDocument.ParseValue(ref reader);
        return AllowedRoutesPolicy.Parse(doc.RootElement.GetRawText());
    }

    public override void Write(Utf8JsonWriter writer, RouteAccessGrant[]? value, JsonSerializerOptions options)
    {
        if (value == null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStartArray();
        foreach (var grant in value)
        {
            writer.WriteStartObject();
            writer.WriteString("path", grant.Path);
            writer.WriteString("access", grant.Access);
            writer.WriteEndObject();
        }

        writer.WriteEndArray();
    }
}
