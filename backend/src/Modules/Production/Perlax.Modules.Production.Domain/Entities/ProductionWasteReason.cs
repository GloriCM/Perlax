namespace Perlax.Modules.Production.Domain.Entities;

public class ProductionWasteReason
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool RequiresObservation { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
