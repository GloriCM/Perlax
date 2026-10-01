namespace Perlax.Modules.Budgets.Domain.Elliot;

public static class ElliotBudgetCalculator
{
    public static ElliotBudgetResult Calculate(ElliotBudgetInput input)
    {
        var incomes = input.Incomes ?? Array.Empty<ElliotIncomeLineInput>();
        var people = input.People ?? Array.Empty<ElliotPayrollPersonInput>();
        var fixedItems = input.FixedItems ?? Array.Empty<ElliotFixedItemInput>();
        var commissions = input.Commissions ?? Array.Empty<ElliotCommissionInput>();
        var centers = input.CostCenters ?? Array.Empty<ElliotCostCenterInput>();
        var map = input.MapParams ?? new ElliotMapParamsInput();

        var totalIncome = Round(incomes.Sum(x => x.Amount));
        var materialCost = Round(incomes.Sum(x => x.Amount * x.MaterialPct));
        var incomeBreakdown = incomes.Select(x => new ElliotNamedAmount(
            x.Code, x.Name, Round(x.Amount),
            totalIncome == 0 ? 0 : Round(x.Amount / totalIncome * 100, 2))).ToList();
        var materialBreakdown = incomes.Select(x => new ElliotNamedAmount(
            x.Code, x.Name, Round(x.Amount * x.MaterialPct),
            totalIncome == 0 ? 0 : Round(x.Amount * x.MaterialPct / totalIncome * 100, 2))).ToList();

        var adminPayroll = BuildPayroll(people, ElliotPayrollSections.Admin, SumFixed(fixedItems, ElliotFixedGroups.AuxiliosAdmin));
        var salesPayroll = BuildPayroll(people, ElliotPayrollSections.Sales, SumFixed(fixedItems, ElliotFixedGroups.AuxiliosVentas));
        var productionPayroll = BuildPayroll(people, ElliotPayrollSections.Production, SumFixed(fixedItems, ElliotFixedGroups.AuxiliosProduccion));

        var coopPeople = people.Where(p => p.Section == ElliotPayrollSections.Cooperative).ToList();
        var coopSalary = Round(coopPeople.Sum(p => p.Salary));
        var coopTransport = Round(coopPeople.Sum(p => p.TransportSubsidy));
        var coopPrestaciones = Round(coopSalary * ElliotPayrollRates.CooperativaPrestaciones);
        var coopAdmon = SumFixed(fixedItems, ElliotFixedGroups.AdmonCooperativa);
        var coopTotal = Round(coopSalary + coopTransport + coopPrestaciones + coopAdmon);
        var totalDirectLabor = Round(productionPayroll.Total + coopTotal);

        var honorarios = SumFixed(fixedItems, ElliotFixedGroups.Honorarios);
        var adminOther =
            SumFixed(fixedItems, ElliotFixedGroups.Impuestos)
            + SumFixed(fixedItems, ElliotFixedGroups.Arrendamientos)
            + SumFixed(fixedItems, ElliotFixedGroups.Contribuciones)
            + SumFixed(fixedItems, ElliotFixedGroups.ServiciosAdmin)
            + SumFixed(fixedItems, ElliotFixedGroups.GastosLegales)
            + SumFixed(fixedItems, ElliotFixedGroups.MantenimientoAdmin)
            + SumFixed(fixedItems, ElliotFixedGroups.Adecuacion)
            + SumFixed(fixedItems, ElliotFixedGroups.ViajesAdmin)
            + SumFixed(fixedItems, ElliotFixedGroups.DepreciacionAdmin)
            + SumFixed(fixedItems, ElliotFixedGroups.Diferidos)
            + SumFixed(fixedItems, ElliotFixedGroups.DiversosAdmin);
        var totalAdmin = Round(adminPayroll.Total + honorarios + adminOther);

        // La hoja COSTOS VARIABLES calcula comisión = base × tasa, pero el estado de
        // resultados del Excel no suma esa hoja: las comisiones que entran a gastos de
        // ventas van digitadas en ServiciosVentas.
        var commissionTotal = Round(commissions.Sum(c => c.BaseAmount * c.Rate));
        var salesOther =
            SumFixed(fixedItems, ElliotFixedGroups.ArrendamientosVentas)
            + SumFixed(fixedItems, ElliotFixedGroups.ServiciosVentas)
            + SumFixed(fixedItems, ElliotFixedGroups.ViajesVentas)
            + SumFixed(fixedItems, ElliotFixedGroups.DiversosVentas);
        var totalSales = Round(salesPayroll.Total + salesOther);

        var financial = SumFixed(fixedItems, ElliotFixedGroups.Financieros);
        var indirectRollup = SumFixed(fixedItems, ElliotFixedGroups.CostosIndirectos);
        var machineMaint = SumFixed(fixedItems, ElliotFixedGroups.MantenimientoMaquinas);
        var indirect = indirectRollup > 0 ? indirectRollup : machineMaint;
        var contratos = SumFixed(fixedItems, ElliotFixedGroups.ContratosServicios);

        var grossProfit = Round(totalIncome - materialCost);
        var productionCost = Round(materialCost + totalDirectLabor + indirect + contratos);
        var totalExpenses = Round(totalAdmin + totalSales + financial);
        var utility = Round(totalIncome - productionCost - totalExpenses);

        decimal Pct(decimal amount) => totalIncome == 0 ? 0 : Round(amount / totalIncome * 100, 2);

        var summaryRows = new List<ElliotSummaryRow>
        {
            new("Ingresos", totalIncome, Pct(totalIncome), "income"),
            new("Costo materia prima", materialCost, Pct(materialCost), "cost"),
            new("Costo mano de obra", totalDirectLabor, Pct(totalDirectLabor), "cost"),
            new("Costos indirectos", indirect, Pct(indirect), "cost"),
            new("Contratos servicios", contratos, Pct(contratos), "cost"),
            new("Costo producción", productionCost, Pct(productionCost), "subtotal"),
            new("Gastos administrativos", totalAdmin, Pct(totalAdmin), "expense"),
            new("Gastos de ventas", totalSales, Pct(totalSales), "expense"),
            new("Gastos financieros", financial, Pct(financial), "expense"),
            new("Total gastos", totalExpenses, Pct(totalExpenses), "subtotal"),
            new("Utilidad", utility, Pct(utility), "result")
        };

        var mapRows = BuildCostMap(people, fixedItems, centers, map, totalAdmin, totalSales, financial, out var mapFactors);
        var peoplePayroll = people
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .Select(BuildPersonPayroll)
            .ToList();

        return new ElliotBudgetResult(
            totalIncome,
            materialCost,
            grossProfit,
            adminPayroll,
            salesPayroll,
            productionPayroll,
            coopTotal,
            coopPrestaciones,
            totalDirectLabor,
            honorarios,
            totalAdmin,
            commissionTotal,
            totalSales,
            financial,
            indirect,
            contratos,
            productionCost,
            totalExpenses,
            utility,
            incomeBreakdown,
            materialBreakdown,
            summaryRows,
            mapRows,
            commissions.Select(c => new ElliotNamedAmount(
                c.Name, c.Name, Round(c.BaseAmount * c.Rate), Round(c.Rate * 100, 2))).ToList(),
            peoplePayroll,
            mapFactors.General,
            mapFactors.Admin,
            mapFactors.Financial);
    }

    public static ElliotPayrollBlock BuildPayroll(
        IEnumerable<ElliotPayrollPersonInput> people,
        string section,
        decimal auxilios)
    {
        var list = people.Where(p => p.Section == section).ToList();
        var salary = Round(list.Sum(p => p.Salary));
        var transport = Round(list.Sum(p => p.TransportSubsidy));
        return BuildPayrollFromTotals(salary, transport, auxilios);
    }

    public static ElliotPersonPayrollResult BuildPersonPayroll(ElliotPayrollPersonInput person)
    {
        if (string.Equals(person.Section, ElliotPayrollSections.Cooperative, StringComparison.OrdinalIgnoreCase))
        {
            var salary = Round(person.Salary);
            var transport = Round(person.TransportSubsidy);
            var prestaciones = Round(salary * ElliotPayrollRates.CooperativaPrestaciones);
            return new ElliotPersonPayrollResult(
                person.Section, person.Name, person.Role, person.CostCenterCode,
                salary, transport, 0, 0, 0, 0, 0, 0, 0, 0,
                prestaciones, Round(salary + transport + prestaciones));
        }

        var block = BuildPayrollFromTotals(person.Salary, person.TransportSubsidy, 0);
        return new ElliotPersonPayrollResult(
            person.Section, person.Name, person.Role, person.CostCenterCode,
            block.Salary, block.Transport, block.Cesantia, block.InteresCesantia, block.Prima,
            block.Vacaciones, block.Arl, block.Salud, block.Pension, block.Caja,
            block.Prestaciones, block.Total);
    }

    public static ElliotPayrollBlock BuildPayrollFromTotals(decimal salaryRaw, decimal transportRaw, decimal auxilios)
    {
        var salary = Round(salaryRaw);
        var transport = Round(transportRaw);
        var cesantia = Round((salary + transport) * ElliotPayrollRates.CesantiaPrima);
        var interes = Round(cesantia * ElliotPayrollRates.InteresCesantia);
        var prima = Round((salary + transport) * ElliotPayrollRates.CesantiaPrima);
        var vacaciones = Round(salary * ElliotPayrollRates.Vacaciones);
        var arl = Round(salary * ElliotPayrollRates.Arl);
        var salud = Round(salary * ElliotPayrollRates.Salud);
        var pension = Round(salary * ElliotPayrollRates.Pension);
        var caja = Round((salary + vacaciones) * ElliotPayrollRates.Caja);
        var prestaciones = Round(cesantia + interes + prima + vacaciones + arl + salud + pension + caja);
        var total = Round(salary + transport + prestaciones + auxilios);
        return new ElliotPayrollBlock(
            salary, transport, cesantia, interes, prima, vacaciones, auxilios,
            arl, salud, pension, caja, prestaciones, total);
    }

    /// <summary>
    /// Mapa de costos como la hoja MAPA DE COSTOS:
    /// primario del centro = (sueldo+transporte) × (1 + factor prestaciones) + gastos varios;
    /// factor GG = primarios generales / suma de primarios de centros;
    /// factor admin = (gastos admin + ventas) / (primarios centros + generales);
    /// factor financiero = gastos financieros / (primarios + admin + ventas);
    /// hora real = hora ideal / utilización.
    /// </summary>
    private static List<ElliotCostCenterResult> BuildCostMap(
        IReadOnlyList<ElliotPayrollPersonInput> people,
        IReadOnlyList<ElliotFixedItemInput> fixedItems,
        IReadOnlyList<ElliotCostCenterInput> centers,
        ElliotMapParamsInput map,
        decimal totalAdmin,
        decimal totalSales,
        decimal financial,
        out (decimal General, decimal Admin, decimal Financial) factors)
    {
        factors = (0, 0, 0);
        if (centers.Count == 0) return new List<ElliotCostCenterResult>();

        var productionPeople = people.Where(p => p.Section == ElliotPayrollSections.Production).ToList();
        var codes = centers
            .Select(c => c.Code)
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var rows = new List<(ElliotCostCenterInput Center, decimal Primary)>();
        decimal totalPrimary = 0;
        foreach (var center in centers.OrderBy(c => c.SortOrder))
        {
            var assigned = productionPeople.Where(p =>
                string.Equals(p.CostCenterCode, center.Code, StringComparison.OrdinalIgnoreCase));
            var salaryTransport = assigned.Sum(p => p.Salary + p.TransportSubsidy);
            var factor = center.PrestacionesFactor <= 0 ? 0.5m : center.PrestacionesFactor;
            var primary = salaryTransport + (salaryTransport * factor) + center.ExtraPersonnel;
            totalPrimary += primary;
            rows.Add((center, primary));
        }

        var generalPeople = productionPeople.Where(p =>
            string.IsNullOrWhiteSpace(p.CostCenterCode) || !codes.Contains(p.CostCenterCode));
        var generalSalary = generalPeople.Sum(p => p.Salary + p.TransportSubsidy);
        var generalLabor = generalSalary + (generalSalary * 0.5m);

        var indirectItems = fixedItems.Where(i => i.Group == ElliotFixedGroups.CostosIndirectos).ToList();
        var indirect = indirectItems.Sum(i => i.Amount);
        if (indirect == 0)
            indirect = fixedItems.Where(i => i.Group == ElliotFixedGroups.MantenimientoMaquinas).Sum(i => i.Amount);
        var internacional = indirectItems
            .Where(i => i.Concept.Contains("internacional", StringComparison.OrdinalIgnoreCase))
            .Sum(i => i.Amount);
        var cif = indirect - internacional;

        var contractItems = fixedItems.Where(i => i.Group == ElliotFixedGroups.ContratosServicios).ToList();
        var otrosGastos = contractItems
            .Where(i => !i.Concept.Contains('%', StringComparison.Ordinal))
            .Sum(i => i.Amount);

        var generalPrimary = generalLabor + cif + otrosGastos;
        var ggFactor = totalPrimary == 0 ? 0 : generalPrimary / totalPrimary;
        var operational = totalPrimary + generalPrimary;
        var adminBase = totalAdmin + totalSales;
        var adminFactor = operational == 0 ? 0 : adminBase / operational;
        var withAdminBase = operational + adminBase;
        var finFactor = withAdminBase == 0 ? 0 : financial / withAdminBase;
        factors = (ggFactor, adminFactor, finFactor);

        var util = map.UtilizationPct <= 0 ? 1m : map.UtilizationPct;
        var rebuilt = new List<ElliotCostCenterResult>();
        foreach (var (center, primary) in rows)
        {
            var hours = center.ProductiveHours <= 0 ? 1m : center.ProductiveHours;
            var share = totalPrimary == 0 ? 0 : primary / totalPrimary;
            var primaryPerHour = primary / hours;
            var centerHour = primaryPerHour * (1 + ggFactor);
            var plusAdmin = centerHour * (1 + adminFactor);
            var ideal = plusAdmin * (1 + finFactor);
            var real = ideal / util;
            rebuilt.Add(new ElliotCostCenterResult(
                center.Code, center.Name, Round(primary), center.ProductiveHours,
                Round(primaryPerHour), Round(plusAdmin), Round(ideal), Round(real), Round(share * 100, 2)));
        }

        return rebuilt;
    }

    private static decimal SumFixed(IEnumerable<ElliotFixedItemInput> items, string group) =>
        Round(items.Where(i => i.Group == group).Sum(i => i.Amount));

    public static decimal Round(decimal value, int decimals = 2) =>
        Math.Round(value, decimals, MidpointRounding.AwayFromZero);
}

public sealed record ElliotPayrollBlock(
    decimal Salary,
    decimal Transport,
    decimal Cesantia,
    decimal InteresCesantia,
    decimal Prima,
    decimal Vacaciones,
    decimal Auxilios,
    decimal Arl,
    decimal Salud,
    decimal Pension,
    decimal Caja,
    decimal Prestaciones,
    decimal Total);

public sealed record ElliotPersonPayrollResult(
    string Section,
    string Name,
    string Role,
    string? CostCenterCode,
    decimal Salary,
    decimal Transport,
    decimal Cesantia,
    decimal InteresCesantia,
    decimal Prima,
    decimal Vacaciones,
    decimal Arl,
    decimal Salud,
    decimal Pension,
    decimal Caja,
    decimal Prestaciones,
    decimal Total);

public sealed record ElliotNamedAmount(string Code, string Name, decimal Amount, decimal Percent);

public sealed record ElliotSummaryRow(string Label, decimal Amount, decimal PercentOfIncome, string Kind);

public sealed record ElliotCostCenterResult(
    string Code,
    string Name,
    decimal PrimaryCost,
    decimal ProductiveHours,
    decimal PrimaryPerHour,
    decimal LoadedPerHour,
    decimal IdealPerHour,
    decimal RealPerHour,
    decimal SharePercent);

public sealed record ElliotBudgetResult(
    decimal TotalIncome,
    decimal MaterialCost,
    decimal GrossProfit,
    ElliotPayrollBlock AdminPayroll,
    ElliotPayrollBlock SalesPayroll,
    ElliotPayrollBlock ProductionPayroll,
    decimal CooperativeLabor,
    decimal CooperativePrestaciones,
    decimal TotalDirectLabor,
    decimal Honorarios,
    decimal TotalAdminExpenses,
    decimal CommissionTotal,
    decimal TotalSalesExpenses,
    decimal FinancialExpenses,
    decimal IndirectCosts,
    decimal ServiceContracts,
    decimal ProductionCost,
    decimal TotalOperatingExpenses,
    decimal Utility,
    IReadOnlyList<ElliotNamedAmount> IncomeBreakdown,
    IReadOnlyList<ElliotNamedAmount> MaterialBreakdown,
    IReadOnlyList<ElliotSummaryRow> SummaryRows,
    IReadOnlyList<ElliotCostCenterResult> CostCenters,
    IReadOnlyList<ElliotNamedAmount> Commissions,
    IReadOnlyList<ElliotPersonPayrollResult> PeoplePayroll,
    decimal MapGeneralFactor = 0,
    decimal MapAdminFactor = 0,
    decimal MapFinancialFactor = 0);
