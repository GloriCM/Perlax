namespace Perlax.Modules.Production.Domain.Entities;

public class DesignPlannerActivity
{
    public Guid Id { get; set; }
    public Guid DesignPlannerJobId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public DateOnly FechaEnvio { get; set; }
    public DateOnly? FechaRecepcion { get; set; }
    public int Repeticiones { get; set; } = 1;
    public string Observaciones { get; set; } = string.Empty;
    public bool Completada { get; set; }
    public int SortOrder { get; set; }
    public DesignPlannerJob? Job { get; set; }
}