namespace Perlax.Modules.Budgets.Domain.Elliot;

public sealed class ElliotBudgetInput
{
    public IReadOnlyList<ElliotIncomeLineInput> Incomes { get; init; } = Array.Empty<ElliotIncomeLineInput>();
    public IReadOnlyList<ElliotPayrollPersonInput> People { get; init; } = Array.Empty<ElliotPayrollPersonInput>();
    public IReadOnlyList<ElliotFixedItemInput> FixedItems { get; init; } = Array.Empty<ElliotFixedItemInput>();
    public IReadOnlyList<ElliotCommissionInput> Commissions { get; init; } = Array.Empty<ElliotCommissionInput>();
    public IReadOnlyList<ElliotCostCenterInput> CostCenters { get; init; } = Array.Empty<ElliotCostCenterInput>();
    public ElliotMapParamsInput MapParams { get; init; } = new();
}

public sealed record ElliotIncomeLineInput(string Code, string Name, decimal Amount, decimal MaterialPct);

public sealed record ElliotPayrollPersonInput(
    string Section,
    string Name,
    string Role,
    decimal Salary,
    decimal TransportSubsidy,
    string? CostCenterCode,
    int SortOrder);

public sealed record ElliotFixedItemInput(string Group, string Concept, decimal Amount, int SortOrder);

public sealed record ElliotCommissionInput(string Name, decimal Rate, decimal BaseAmount, string Group, int SortOrder);

public sealed record ElliotCostCenterInput(
    string Code,
    string Name,
    decimal ProductiveHours,
    int SortOrder,
    decimal PrestacionesFactor = 0.5m,
    decimal ExtraPersonnel = 0m);

public sealed record ElliotMapParamsInput(
    decimal GeneralMfgFactor = 1.07m,
    decimal AdminFactor = 0.42m,
    decimal FinancialFactor = 0.04m,
    decimal UtilizationPct = 0.70m);
