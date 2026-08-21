namespace Perlax.Modules.Almacen.Domain.Entities;

public class AlmacenProducto
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string TipoRequisicionId { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public decimal CostoEstandar { get; set; }
    public string UnidadSugerida { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
}