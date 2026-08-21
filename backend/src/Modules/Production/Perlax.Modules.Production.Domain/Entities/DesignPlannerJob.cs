namespace Perlax.Modules.Production.Domain.Entities;

public class DesignPlannerJob
{
    public Guid Id { get; set; }
    public string JobNumber { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public string Vendedor { get; set; } = string.Empty;
    public string Trabajo { get; set; } = string.Empty;
    public string Responsable { get; set; } = string.Empty;
    public string Estado { get; set; } = "Nuevo Trabajo Pendiente";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? FechaRecepcion { get; set; }
    public DateTime? FechaEntrega { get; set; }
    public string Requerimientos { get; set; } = string.Empty;
    public bool FichaAprobada { get; set; }
    public DateTime? FechaAprobacion { get; set; }
    public string ComentariosAprobacion { get; set; } = string.Empty;
    public string HistorialJson { get; set; } = "[]";
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public ICollection<DesignPlannerActivity> Actividades { get; set; } = new List<DesignPlannerActivity>();
}