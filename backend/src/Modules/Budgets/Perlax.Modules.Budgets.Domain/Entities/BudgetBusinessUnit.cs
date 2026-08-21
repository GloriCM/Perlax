namespace Perlax.Modules.Budgets.Domain.Entities;

public class BudgetBusinessUnit
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Responsible { get; set; } = string.Empty;
    public string? Approver { get; set; }
    public DateTime? ApprovalDate { get; set; }
    public string Status { get; set; } = "Pendiente";
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    public Budget? Budget { get; set; }
    public ICollection<BudgetLine> Lines { get; set; } = new List<BudgetLine>();
    public ICollection<BudgetPersonnelItem> Personnel { get; set; } = new List<BudgetPersonnelItem>();
}
