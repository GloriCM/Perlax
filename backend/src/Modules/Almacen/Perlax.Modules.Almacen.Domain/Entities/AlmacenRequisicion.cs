namespace Perlax.Modules.Almacen.Domain.Entities;

public class AlmacenRequisicion
{
    public Guid Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public int AnioCodigo { get; set; }
    public int SecuenciaCodigo { get; set; }
    public string TipoRequisicionId { get; set; } = string.Empty;
    public DateTime FechaSolicitud { get; set; }
    public string OrdenProduccionNumero { get; set; } = string.Empty;
    public Guid? CatalogoOpId { get; set; }
    public string Cliente { get; set; } = string.Empty;
    public string Referencia { get; set; } = string.Empty;
    public Guid? ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public string Unidad { get; set; } = string.Empty;
    public DateTime FechaRequerida { get; set; }
    public string? Observacion { get; set; }
    public string Estado { get; set; } = "Pendiente";
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    public Guid? CreadoPorId { get; set; }
    public string CreadoPorNombre { get; set; } = string.Empty;

    public AlmacenPedido? Pedido { get; set; }
    public ICollection<AlmacenRecepcionLinea> Recepciones { get; set; } = new List<AlmacenRecepcionLinea>();
}