namespace Perlax.Modules.Production.Domain.Entities;

public class ProductionActivityCode
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool RequiresOrder { get; set; }
    public bool AllowsProductionQty { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public ICollection<ProductionActivitySubcode> Subcodes { get; set; } = new List<ProductionActivitySubcode>();
}

public class ProductionActivitySubcode
{
    public Guid Id { get; set; }
    public Guid ActivityCodeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool RequiresObservation { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    public ProductionActivityCode? ActivityCode { get; set; }
}
