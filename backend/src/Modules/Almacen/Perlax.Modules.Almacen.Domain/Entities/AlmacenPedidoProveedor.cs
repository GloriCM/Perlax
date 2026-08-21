namespace Perlax.Modules.Almacen.Domain.Entities;

public class AlmacenPedidoProveedor
{
    public Guid Id { get; set; }
    public Guid PedidoId { get; set; }
    public Guid? ProveedorCatalogoId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Nit { get; set; }
    public string? Telefono { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public DateTime? FechaEntregaEstimada { get; set; }
    public bool Recibido { get; set; }
    public bool Pagado { get; set; }
    public string? FormaPago { get; set; }
    public string? NumeroOrdenCompra { get; set; }
    public Guid? OrdenCompraId { get; set; }

    public AlmacenPedido Pedido { get; set; } = null!;
    public AlmacenOrdenCompra? OrdenCompra { get; set; }
}