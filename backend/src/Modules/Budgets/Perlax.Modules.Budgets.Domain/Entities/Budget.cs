namespace Perlax.Modules.Budgets.Domain.Entities;

public class Budget
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public int FiscalYear { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? CostCenter { get; set; }
    public string Currency { get; set; } = "COP";
    public string Status { get; set; } = "Pendiente";
    public string? GeneralApprover { get; set; }
    public DateTime? GeneralApprovalDate { get; set; }
    public string? ApprovalObservations { get; set; }
    public string? RejectionReason { get; set; }
    public string Observations { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<BudgetBusinessUnit> BusinessUnits { get; set; } = new List<BudgetBusinessUnit>();
    public ICollection<BudgetLine> Lines { get; set; } = new List<BudgetLine>();
    public ICollection<BudgetPersonnelItem> Personnel { get; set; } = new List<BudgetPersonnelItem>();
    public ICollection<BudgetAdjustment> Adjustments { get; set; } = new List<BudgetAdjustment>();
}
