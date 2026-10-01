namespace Perlax.Modules.Production.Domain.Entities;

public class CotizadorBarniz
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Factor { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
