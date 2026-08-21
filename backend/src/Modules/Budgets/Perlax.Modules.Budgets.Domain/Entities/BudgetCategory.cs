namespace Perlax.Modules.Budgets.Domain.Entities;

public class BudgetCategory
{
    public Guid Id { get; set; }
    public string LineType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
