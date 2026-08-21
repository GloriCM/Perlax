namespace Perlax.Modules.Almacen.Domain.Entities;

public class AlmacenPedido
{
    public Guid Id { get; set; }
    public Guid RequisicionId { get; set; }
    public DateTime FechaPedido { get; set; }
    public DateTime? FechaEntregaEstimada { get; set; }
    public decimal? PrecioUnitario { get; set; }
    public Guid? ProcesadoPorId { get; set; }
    public string? ProcesadoPorNombre { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;

    public AlmacenRequisicion Requisicion { get; set; } = null!;
    public ICollection<AlmacenPedidoProveedor> Proveedores { get; set; } = new List<AlmacenPedidoProveedor>();
}