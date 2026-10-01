namespace Perlax.Modules.Budgets.Domain.Entities;

public class BudgetIncomeLine
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal MaterialPct { get; set; } = 0.45m;
    public int SortOrder { get; set; }
    public Budget? Budget { get; set; }
}

public class BudgetPayrollPerson
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public string Section { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public decimal Salary { get; set; }
    public decimal TransportSubsidy { get; set; }
    public string? CostCenterCode { get; set; }
    public int SortOrder { get; set; }
    public Budget? Budget { get; set; }
}

public class BudgetFixedItem
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public string Group { get; set; } = string.Empty;
    public string Concept { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int SortOrder { get; set; }
    public Budget? Budget { get; set; }
}

public class BudgetVariableCommission
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Group { get; set; } = "Comisiones";
    public decimal Rate { get; set; }
    public decimal BaseAmount { get; set; }
    public int SortOrder { get; set; }
    public Budget? Budget { get; set; }
}

public class BudgetCostCenter
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal ProductiveHours { get; set; }
    /// <summary>Excel mapa: prestaciones = (sueldo+transporte) × este factor. 0.5 o 0.55.</summary>
    public decimal PrestacionesFactor { get; set; } = 0.5m;
    /// <summary>Excel mapa fila «gastos varios»: se suma al primario del centro.</summary>
    public decimal ExtraPersonnel { get; set; }
    public int SortOrder { get; set; }
    public Budget? Budget { get; set; }
}

public class BudgetMapSettings
{
    public Guid Id { get; set; }
    public Guid BudgetId { get; set; }
    public decimal GeneralMfgFactor { get; set; } = 1.07m;
    public decimal AdminFactor { get; set; } = 0.42m;
    public decimal FinancialFactor { get; set; } = 0.04m;
    public decimal UtilizationPct { get; set; } = 0.70m;
    /// <summary>JSON: secciones/subgrupos personalizables de costos fijos y variables.</summary>
    public string? LayoutJson { get; set; }
    public Budget? Budget { get; set; }
}
