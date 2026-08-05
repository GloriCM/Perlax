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
        ["kg", "unidades", "metros", "litros", "rollos", "cajas", "galones"];

    public static readonly IReadOnlyList<string> FormasPago = ["credito", "efectivo"];

    public static readonly IReadOnlyList<string> CategoriasProveedorEmpresa =
        ["Declarante", "No declarante", "RST", "Autoretenedor"];

    public static readonly IReadOnlyList<string> CategoriasProveedorPersona =
        ["No responsable IVA", "Responsable IVA"];

    public static string NormalizeName(string? value) =>
        string.Join(' ', (value ?? string.Empty).Trim().ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));
}
