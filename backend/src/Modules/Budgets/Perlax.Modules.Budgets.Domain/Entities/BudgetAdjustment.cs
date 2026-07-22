namespace Perlax.Modules.Budgets.Domain.Entities;

public class BudgetAdjustment
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public Guid? BusinessUnitId { get; set; }
    public Guid? BudgetLineId { get; set; }
    public Guid? PersonnelItemId { get; set; }
    public string AdjustmentType { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Concept { get; set; } = string.Empty;
    public decimal PreviousValue { get; set; }
    public decimal AdjustmentValue { get; set; }
    public decimal NewValue { get; set; }
    public string Motive { get; set; } = string.Empty;
    public string Observations { get; set; } = string.Empty;
    public string Status { get; set; } = "Pendiente";
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovalObservations { get; set; }
    public string? RejectionReason { get; set; }

    public Budget? Budget { get; set; }
}
