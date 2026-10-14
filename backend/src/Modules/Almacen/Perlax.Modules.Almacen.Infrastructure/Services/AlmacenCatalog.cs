namespace Perlax.Modules.Almacen.Infrastructure.Services;

public static class AlmacenCatalog
{
    public const string EstadoPendiente = "Pendiente";
    public const string EstadoPedido = "Pedido";
    public const string EstadoParcial = "Parcial";
    public const string EstadoEnAlmacen = "En Almacen";

    public const string OcEmitida = "Emitida";
    public const string OcCerrada = "Cerrada";

    public static readonly IReadOnlyList<(string Id, string Label, string Color)> TiposRequisicion =
    [
        ("consumo_diario", "Insumos de Consumo Diario", "#22c55e"),
        ("cajas_empaque", "Cajas y Empaque", "#3b82f6"),
        ("gomas_adhesivos", "Gomas y Adhesivos", "#eab308"),
        ("pantone", "Tinta", "#a855f7"),
    ];

    public static readonly IReadOnlyList<string> UnidadesMedida =
        ["kg", "unidades", "metros", "litros", "rollos", "cajas", "galones", "hojas", "paquetes", "cm"];

    public static readonly IReadOnlyList<string> FormasPago = ["credito", "efectivo"];

    public static readonly IReadOnlyList<string> CategoriasProveedorEmpresa =
        ["Declarante", "No declarante", "RST", "Autoretenedor"];

    public static readonly IReadOnlyList<string> CategoriasProveedorPersona =
        ["No responsable IVA", "Responsable IVA"];

    public static string NormalizeName(string? value) =>
        string.Join(' ', (value ?? string.Empty).Trim().ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));

    /// <summary>
    /// Lleva abreviaturas del catálogo de la empresa a la unidad que usa el inventario.
    /// Si viene vacía, la infiere por el nombre del producto.
    /// </summary>
    public static string NormalizeUnidad(string? raw, string? productName = null)
    {
        var token = (raw ?? string.Empty).Trim().TrimEnd('.').ToLowerInvariant();
        var mapped = token switch
        {
            "kg" or "kl" or "kls" or "kilo" or "kilos" or "kilogramo" or "kilogramos" => "kg",
            "uni" or "und" or "unds" or "unidad" or "unidades" => "unidades",
            "metro" or "metros" or "mt" or "mts" => "metros",
            "litro" or "litros" or "lit" or "lts" or "lt" => "litros",
            "rollo" or "rollos" => "rollos",
            "caja" or "cajas" => "cajas",
            "galon" or "galones" or "galón" => "galones",
            "hoja" or "hojas" => "hojas",
            "paq" or "paquete" or "paquetes" => "paquetes",
            "cm" or "cms" or "centimetro" or "centimetros" or "centímetro" or "centímetros" => "cm",
            _ => null
        };
        if (mapped != null)
            return mapped;
        if (!string.IsNullOrWhiteSpace(token))
            return token;
        return InferUnidad(productName);
    }

    private static string InferUnidad(string? productName)
    {
        var n = (productName ?? string.Empty).ToUpperInvariant();
        if (n.Contains("STICKER", StringComparison.Ordinal) || n.Contains("ETIQUETA", StringComparison.Ordinal) || n.StartsWith("ETQ ", StringComparison.Ordinal))
            return "unidades";
        if (n.Contains("ENMASCAR", StringComparison.Ordinal))
            return "rollos";
        if (n.Contains("MICRO", StringComparison.Ordinal) || n.Contains("PAPKRAFT", StringComparison.Ordinal) || n.Contains("MAULE", StringComparison.Ordinal)
            || n.Contains("CHIP", StringComparison.Ordinal)
            || n.StartsWith("CART ", StringComparison.Ordinal) || n.StartsWith("CART.", StringComparison.Ordinal))
            return "metros";
        return "unidades";
    }
}
