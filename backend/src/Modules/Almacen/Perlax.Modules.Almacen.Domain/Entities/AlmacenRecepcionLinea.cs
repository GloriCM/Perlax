namespace Perlax.Modules.Almacen.Domain.Entities;

public class AlmacenRecepcionLinea
{
    public Guid Id { get; set; }
    public Guid RequisicionId { get; set; }
    public Guid PedidoProveedorId { get; set; }
    public string NombreProveedor { get; set; } = string.Empty;
    public string CodigoUsuario { get; set; } = string.Empty;
    public DateTime FechaLlegada { get; set; }
    public bool CalidadEsperada { get; set; } = true;
    public string? MotivoCalidadNo { get; set; }
    public bool FacturaEntregada { get; set; } = true;
    public string? MotivoFacturaNo { get; set; }
    public decimal CantidadRecibida { get; set; }
    public decimal CantidadPedidaEnMomento { get; set; }
    public bool PedidoCompleto { get; set; }
    public string? MotivoCantidadParcial { get; set; }
    public DateTime? NuevaFechaEntrega { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public Guid? RegistradoPorId { get; set; }
    public string? RegistradoPorNombre { get; set; }

    public AlmacenRequisicion Requisicion { get; set; } = null!;
}