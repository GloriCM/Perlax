using Perlax.Modules.Budgets.Domain.Elliot;

namespace Perlax.Modules.Budgets.Application.Elliot;

public interface IElliotBudgetService
{
    Task EnsureTemplateAsync(Guid budgetId, string user, CancellationToken ct = default);
    Task<ElliotWorkbookDto> GetWorkbookAsync(Guid budgetId, CancellationToken ct = default);
    Task<ElliotWorkbookDto> SaveFixedCostsAsync(Guid budgetId, ElliotFixedCostsSaveRequest request, string user, CancellationToken ct = default);
    Task<ElliotWorkbookDto> SaveVariableCostsAsync(Guid budgetId, ElliotVariableCostsSaveRequest request, string user, CancellationToken ct = default);
    Task<ElliotWorkbookDto> SaveMapParamsAsync(Guid budgetId, ElliotMapParamsSaveRequest request, string user, CancellationToken ct = default);
    Task<ElliotWorkbookDto> SaveWorkbookAsync(Guid budgetId, ElliotWorkbookSaveRequest request, string user, CancellationToken ct = default);
    Task<ElliotBudgetResult> GetSummaryAsync(Guid budgetId, CancellationToken ct = default);
}

public sealed class ElliotWorkbookSaveRequest
{
    public List<ElliotIncomeDto> Incomes { get; set; } = new();
    public List<ElliotPersonDto> People { get; set; } = new();
    public List<ElliotFixedItemDto> FixedItems { get; set; } = new();
    public List<ElliotCommissionDto> Commissions { get; set; } = new();
    public List<ElliotCostCenterDto> CostCenters { get; set; } = new();
    public ElliotMapParamsDto MapParams { get; set; } = new();
    public ElliotLayoutDto? Layout { get; set; }
}

public sealed class ElliotWorkbookDto
{
    public Guid BudgetId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public int FiscalYear { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool CanEdit { get; set; }
    public List<ElliotIncomeDto> Incomes { get; set; } = new();
    public List<ElliotPersonDto> People { get; set; } = new();
    public List<ElliotFixedItemDto> FixedItems { get; set; } = new();
    public List<ElliotCommissionDto> Commissions { get; set; } = new();
    public List<ElliotCostCenterDto> CostCenters { get; set; } = new();
    public ElliotMapParamsDto MapParams { get; set; } = new();
    public ElliotLayoutDto Layout { get; set; } = new();
    public ElliotBudgetResult Summary { get; set; } = null!;
}

public sealed class ElliotIncomeDto
{
    public Guid? Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal MaterialPct { get; set; } = 0.45m;
    public int SortOrder { get; set; }
}

public sealed class ElliotPersonDto
{
    public Guid? Id { get; set; }
    public string Section { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public decimal Salary { get; set; }
    public decimal TransportSubsidy { get; set; }
    public string? CostCenterCode { get; set; }
    public int SortOrder { get; set; }
}

public sealed class ElliotFixedItemDto
{
    public Guid? Id { get; set; }
    public string Group { get; set; } = string.Empty;
    public string Concept { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int SortOrder { get; set; }
}

public sealed class ElliotCommissionDto
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Group { get; set; } = "Comisiones";
    public decimal Rate { get; set; }
    public decimal BaseAmount { get; set; }
    public int SortOrder { get; set; }
}

public sealed class ElliotCostCenterDto
{
    public Guid? Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal ProductiveHours { get; set; }
    public decimal PrestacionesFactor { get; set; } = 0.5m;
    public decimal ExtraPersonnel { get; set; }
    public int SortOrder { get; set; }
}

public sealed class ElliotMapParamsDto
{
    public decimal GeneralMfgFactor { get; set; } = 1.07m;
    public decimal AdminFactor { get; set; } = 0.42m;
    public decimal FinancialFactor { get; set; } = 0.04m;
    public decimal UtilizationPct { get; set; } = 0.70m;
}

public sealed class ElliotFixedCostsSaveRequest
{
    public List<ElliotIncomeDto> Incomes { get; set; } = new();
    public List<ElliotPersonDto> People { get; set; } = new();
    public List<ElliotFixedItemDto> FixedItems { get; set; } = new();
    public List<ElliotCostCenterDto> CostCenters { get; set; } = new();
}

public sealed class ElliotVariableCostsSaveRequest
{
    public List<ElliotCommissionDto> Commissions { get; set; } = new();
}

public sealed class ElliotMapParamsSaveRequest
{
    public ElliotMapParamsDto MapParams { get; set; } = new();
    public List<ElliotCostCenterDto>? CostCenters { get; set; }
}
