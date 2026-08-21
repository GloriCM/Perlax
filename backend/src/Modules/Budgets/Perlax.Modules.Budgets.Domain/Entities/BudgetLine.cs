namespace Perlax.Modules.Budgets.Domain.Entities;

/// <summary>
/// Linea presupuestal generica para ingresos, costos, gastos y materia prima (RC-001).
/// LineType: Income | RawMaterial | ProductionCost | AdminExpense | SalesExpense | FinancialExpense
/// </summary>
public class BudgetLine
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public Guid? BusinessUnitId { get; set; }
    public string LineType { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Concept { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal ProjectedValue { get; set; }
    public string Frequency { get; set; } = "Anual";
    public string? CostCenter { get; set; }
    public string? Code { get; set; }
    public string? UnitOfMeasure { get; set; }
    public string? Provider { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public string? Currency { get; set; }
    public string? ExternalReference { get; set; }
    public string? FinancialEntity { get; set; }
    public string Observations { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Budget? Budget { get; set; }
    public BudgetBusinessUnit? BusinessUnit { get; set; }
}
