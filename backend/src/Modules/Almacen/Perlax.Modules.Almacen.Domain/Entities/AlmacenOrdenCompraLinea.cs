namespace Perlax.Modules.Almacen.Domain.Entities;

public class AlmacenOrdenCompraLinea
{
    public Guid Id { get; set; }
    public Guid OrdenCompraId { get; set; }
    public Guid PedidoProveedorId { get; set; }
    public Guid RequisicionId { get; set; }
    public int Orden { get; set; }

    public AlmacenOrdenCompra OrdenCompra { get; set; } = null!;
}