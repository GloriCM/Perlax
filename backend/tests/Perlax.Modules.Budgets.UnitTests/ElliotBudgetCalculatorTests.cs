using Perlax.Modules.Budgets.Domain.Elliot;
using Xunit;

namespace Perlax.Modules.Budgets.UnitTests;

public class ElliotBudgetCalculatorTests
{
    [Fact]
    public void Admin_payroll_matches_ideal_rates()
    {
        var people = new[]
        {
            new ElliotPayrollPersonInput(ElliotPayrollSections.Admin, "A", "Gerente", 31_550_000m, 9_386_000m, null, 1)
        };
        // Using totals as single person for formula check (same as Ideal C21/D21)
        var block = ElliotBudgetCalculator.BuildPayroll(people, ElliotPayrollSections.Admin, 0);

        Assert.Equal(31_550_000m, block.Salary);
        Assert.Equal(9_386_000m, block.Transport);
        Assert.Equal(3_409_968.80m, block.Cesantia);
        Assert.Equal(409_196.26m, block.InteresCesantia);
        Assert.Equal(3_409_968.80m, block.Prima);
        Assert.Equal(1_312_480m, block.Vacaciones);
        Assert.Equal(788_750m, block.Arl);
        Assert.Equal(2_681_750m, block.Salud);
        Assert.Equal(3_786_000m, block.Pension);
        Assert.Equal(1_314_499.20m, block.Caja);
        Assert.Equal(
            block.Cesantia + block.InteresCesantia + block.Prima + block.Vacaciones
            + block.Arl + block.Salud + block.Pension + block.Caja,
            block.Prestaciones);
    }

    [Fact]
    public void Person_payroll_shows_prestaciones_breakdown()
    {
        var person = new ElliotPayrollPersonInput(ElliotPayrollSections.Admin, "Ana", "Asistente", 1_000_000m, 0m, null, 1);
        var row = ElliotBudgetCalculator.BuildPersonPayroll(person);
        Assert.Equal(83_300m, row.Cesantia);
        Assert.True(row.Prestaciones > 0);
        Assert.Equal(row.Salary + row.Transport + row.Prestaciones, row.Total);
    }

    [Fact]
    public void Summary_material_is_pct_of_income()
    {
        var input = new ElliotBudgetInput
        {
            Incomes =
            [
                new ElliotIncomeLineInput("ELLIOT", "Elliot", 400_000_000m, 0.45m),
                new ElliotIncomeLineInput("SVBAGS", "SV", 400_000_000m, 0.45m),
                new ElliotIncomeLineInput("FEDEX", "FedEx", 100_000_000m, 0m)
            ]
        };
        var result = ElliotBudgetCalculator.Calculate(input);
        Assert.Equal(900_000_000m, result.TotalIncome);
        Assert.Equal(360_000_000m, result.MaterialCost);
        Assert.Equal(40m, result.SummaryRows.First(r => r.Label == "Costo materia prima").PercentOfIncome);
    }

    [Fact]
    public void Commission_is_rate_times_base()
    {
        var input = new ElliotBudgetInput
        {
            Commissions =
            [
                new ElliotCommissionInput("Olga", 0.03m, 100_000_000m, "Cooperativa", 1),
                new ElliotCommissionInput("Claudia", 0.025m, 100_000_000m, "Agentes", 2)
            ]
        };
        var result = ElliotBudgetCalculator.Calculate(input);
        Assert.Equal(5_500_000m, result.CommissionTotal);
    }

    [Fact]
    public void Grafica_elliot_2026_matches_excel_workbook()
    {
        var result = ElliotBudgetCalculator.Calculate(ElliotGraficaElliot2026.CreateInput());

        Assert.Equal(900_000_000m, result.TotalIncome);
        Assert.Equal(360_000_000m, result.MaterialCost);
        Assert.Equal(156_429_161.20m, result.TotalDirectLabor);
        Assert.Equal(146_700_000m, result.IndirectCosts);
        Assert.Equal(59_700_000m, result.ServiceContracts);
        Assert.Equal(722_829_161.20m, result.ProductionCost);
        Assert.Equal(83_168_613.06m, result.TotalAdminExpenses);
        Assert.Equal(6_201_404m, result.TotalSalesExpenses);
        Assert.Equal(12_900_000m, result.FinancialExpenses);
        Assert.Equal(102_270_017.06m, result.TotalOperatingExpenses);
        Assert.Equal(74_900_821.74m, result.Utility);
        Assert.Equal(5_500_000m, result.CommissionTotal);

        var corte = result.CostCenters.Single(c => c.Code == "CORTE");
        Assert.Equal(10_975_000m, corte.PrimaryCost);
        Assert.InRange(corte.PrimaryPerHour, 18_291m, 18_292m);
        Assert.InRange(corte.RealPerHour, 79_630m, 79_632m);

        var impresion = result.CostCenters.Single(c => c.Code == "IMPRESION");
        Assert.Equal(29_375_000m, impresion.PrimaryCost);
        Assert.InRange(impresion.RealPerHour, 127_881m, 127_882m);

        var uv = result.CostCenters.Single(c => c.Code == "UV");
        Assert.Equal(3_642_500m, uv.PrimaryCost);
        Assert.InRange(uv.RealPerHour, 39_642m, 39_644m);

        Assert.InRange(result.MapGeneralFactor, 1.065m, 1.066m);
        Assert.InRange(result.MapAdminFactor, 0.415m, 0.416m);
        Assert.InRange(result.MapFinancialFactor, 0.042m, 0.043m);
    }
}
