namespace Perlax.Modules.Budgets.Domain.Entities;

public class BudgetPersonnelItem
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public Guid? BusinessUnitId { get; set; }
    public string Position { get; set; } = string.Empty;
    public string Area { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? CostCenter { get; set; }
    public string ContractType { get; set; } = "Indefinido";
    public int Headcount { get; set; }
    public decimal MonthlySalary { get; set; }
    public decimal Benefits { get; set; }
    public decimal Allowances { get; set; }
    public decimal Bonuses { get; set; }
    public decimal Overtime { get; set; }
    public string Observations { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Budget? Budget { get; set; }
    public BudgetBusinessUnit? BusinessUnit { get; set; }

    public decimal MonthlyTotal => Headcount * MonthlySalary + Benefits + Allowances + Bonuses + Overtime;
    public decimal AnnualTotal => MonthlyTotal * 12;
}
