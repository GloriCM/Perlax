namespace Perlax.Modules.Almacen.Domain.Entities;

public class AlmacenOrdenCompra
{
    public Guid Id { get; set; }
    public string NumeroOrdenCompra { get; set; } = string.Empty;
    public Guid? ProveedorCatalogoId { get; set; }
    public string NombreProveedor { get; set; } = string.Empty;
    public string? NitProveedor { get; set; }
    public string? TelefonoProveedor { get; set; }
    public DateTime FechaPedido { get; set; }
    public DateTime? FechaEntregaEstimada { get; set; }
    public string Estado { get; set; } = "Emitida";
    public bool Pagado { get; set; }
    public string? FormaPago { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public Guid? CreadoPorId { get; set; }
    public string? CreadoPorNombre { get; set; }

    public ICollection<AlmacenOrdenCompraLinea> Lineas { get; set; } = new List<AlmacenOrdenCompraLinea>();
}