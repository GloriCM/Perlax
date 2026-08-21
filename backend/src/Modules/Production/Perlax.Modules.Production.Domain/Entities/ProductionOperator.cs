namespace Perlax.Modules.Production.Domain.Entities;

/// <summary>
/// Catálogo laboral de operarios. UserId es opcional y no tiene FK entre módulos.
/// </summary>
public class ProductionOperator
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? DocumentNumber { get; set; }
    public Guid? UserId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}
