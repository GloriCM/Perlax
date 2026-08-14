namespace Perlax.Modules.Production.Domain.Entities;

public class ProductionMachine
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Categoria de proceso (Conversion, Impresion, etc.) para roster y planeacion.</summary>
    public string? ProcessCode { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}
