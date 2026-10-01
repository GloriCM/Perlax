using Perlax.Modules.Budgets.Domain.Entities;
using Perlax.Modules.Budgets.Infrastructure.Persistence;

namespace Perlax.Modules.Budgets.Infrastructure.Services;

/// <summary>
/// Plantilla mínima al crear un presupuesto: solo parámetros de cálculo del mapa.
/// Sin ingresos, personas, rubros ni comisiones — el usuario arma todo desde cero.
/// </summary>
public static class ElliotBudgetTemplate
{
    public static void ApplyEmptyTemplate(Guid budgetId, BudgetsDbContext db)
    {
        db.BudgetMapSettings.Add(new BudgetMapSettings
        {
            Id = Guid.NewGuid(),
            BudgetId = budgetId,
            GeneralMfgFactor = 1.07m,
            AdminFactor = 0.42m,
            FinancialFactor = 0.04m,
            UtilizationPct = 0.70m,
            LayoutJson = """{"fixed":[],"variable":[]}"""
        });
    }
}
