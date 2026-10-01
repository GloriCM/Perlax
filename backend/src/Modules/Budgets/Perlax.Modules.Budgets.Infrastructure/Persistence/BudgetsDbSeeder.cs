using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Budgets.Application.Elliot;
using Perlax.Modules.Budgets.Domain.Elliot;
using Perlax.Modules.Budgets.Domain.Entities;

namespace Perlax.Modules.Budgets.Infrastructure.Persistence;

public static class BudgetsDbSeeder
{
    public static async Task SeedAsync(BudgetsDbContext context)
    {
        // Asegura tablas Elliot aunque la migración EF no se haya aplicado.
        await ElliotBudgetSchemaFixes.ApplyAsync(context);

        if (!await context.BudgetCategories.AnyAsync())
        {
            var categories = new List<(string Type, string[] Names)>
            {
                ("Income", ["Ventas nacionales", "Ventas internacionales", "Servicios", "Otros ingresos operacionales", "Otros ingresos"]),
                ("RawMaterial", ["Materia Prima Nacional", "Materia Prima Importada", "Materiales Auxiliares", "Insumos de Produccion", "Empaques", "Embalajes", "Otros materiales"]),
                ("ProductionCost", ["Mano de Obra Directa", "Costos Indirectos de Fabricacion", "Servicios Externos", "Energia", "Mantenimiento", "Herramientas y consumibles", "Control de calidad", "Procesos tercerizados", "Otros costos de produccion"]),
                ("AdminExpense", ["Personal Administrativo", "Honorarios", "Impuestos y contribuciones", "Arrendamientos", "Servicios Publicos", "Servicios Generales", "Papeleria", "Mantenimiento", "Licencias de software", "Seguros", "Capacitacion", "Viajes", "Depreciaciones", "Amortizaciones", "Otros gastos administrativos"]),
                ("SalesExpense", ["Personal de Ventas", "Comisiones por ventas", "Publicidad y Mercadeo", "Promociones", "Atencion a clientes", "Viajes comerciales", "Viaticos", "Transporte", "Arrendamientos comerciales", "Ferias y eventos", "Material publicitario", "Gastos de representacion", "Otros gastos comerciales"]),
                ("FinancialExpense", ["Intereses de creditos", "Comisiones bancarias", "Diferencia en cambio", "Descuentos financieros", "Gastos por prestamos", "Costos de financiacion", "Operaciones bancarias", "Impuestos financieros", "Otros gastos financieros"]),
                ("Personnel", ["Personal Administrativo", "Personal Operativo", "Personal de Produccion", "Personal Comercial", "Personal Logistico", "Personal Directivo", "Personal Temporal", "Contratistas", "Aprendices", "Otros"])
            };

            var order = 0;
            foreach (var (type, names) in categories)
            {
                foreach (var name in names)
                {
                    context.BudgetCategories.Add(new BudgetCategory
                    {
                        Id = Guid.NewGuid(),
                        LineType = type,
                        Name = name,
                        IsActive = true,
                        SortOrder = order++
                    });
                }
            }

            await context.SaveChangesAsync();
        }

        await SeedGraficaElliot2026Async(context);
    }

    private static async Task SeedGraficaElliot2026Async(BudgetsDbContext context)
    {
        var input = ElliotGraficaElliot2026.CreateInput();
        var budget = await context.Budgets.FirstOrDefaultAsync(b =>
            b.Company == ElliotGraficaElliot2026.Company && b.FiscalYear == ElliotGraficaElliot2026.Year);

        if (budget != null && await context.BudgetIncomeLines.AnyAsync(x => x.BudgetId == budget.Id && x.Amount > 0))
            return;

        if (budget == null)
        {
            var prefix = $"PRE-{ElliotGraficaElliot2026.Year}-";
            var codes = await context.Budgets.AsNoTracking()
                .Where(b => b.Code.StartsWith(prefix))
                .Select(b => b.Code)
                .ToListAsync();
            var max = 0;
            foreach (var code in codes)
            {
                if (int.TryParse(code[prefix.Length..], out var n) && n > max) max = n;
            }

            budget = new Budget
            {
                Id = Guid.NewGuid(),
                Code = $"{prefix}{(max + 1).ToString().PadLeft(3, '0')}",
                Company = ElliotGraficaElliot2026.Company,
                FiscalYear = ElliotGraficaElliot2026.Year,
                StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc),
                Currency = "COP",
                Status = "Pendiente",
                Observations = "Cargado desde Presupuesto.xlsx (presupuesto, costos fijos, costos variables y mapa de costos).",
                CreatedBy = "excel-presupuesto",
                CreatedAt = DateTime.UtcNow
            };
            context.Budgets.Add(budget);
            await context.SaveChangesAsync();
        }

        var id = budget.Id;
        context.BudgetIncomeLines.RemoveRange(await context.BudgetIncomeLines.Where(x => x.BudgetId == id).ToListAsync());
        context.BudgetPayrollPeople.RemoveRange(await context.BudgetPayrollPeople.Where(x => x.BudgetId == id).ToListAsync());
        context.BudgetFixedItems.RemoveRange(await context.BudgetFixedItems.Where(x => x.BudgetId == id).ToListAsync());
        context.BudgetVariableCommissions.RemoveRange(await context.BudgetVariableCommissions.Where(x => x.BudgetId == id).ToListAsync());
        context.BudgetCostCenters.RemoveRange(await context.BudgetCostCenters.Where(x => x.BudgetId == id).ToListAsync());

        foreach (var (line, i) in input.Incomes.Select((line, i) => (line, i)))
        {
            context.BudgetIncomeLines.Add(new BudgetIncomeLine
            {
                Id = Guid.NewGuid(),
                BudgetId = id,
                Code = line.Code,
                Name = line.Name,
                Amount = line.Amount,
                MaterialPct = line.MaterialPct,
                SortOrder = i + 1
            });
        }

        foreach (var person in input.People)
        {
            context.BudgetPayrollPeople.Add(new BudgetPayrollPerson
            {
                Id = Guid.NewGuid(),
                BudgetId = id,
                Section = person.Section,
                Name = person.Name,
                Role = person.Role,
                Salary = person.Salary,
                TransportSubsidy = person.TransportSubsidy,
                CostCenterCode = person.CostCenterCode,
                SortOrder = person.SortOrder
            });
        }

        foreach (var item in input.FixedItems)
        {
            context.BudgetFixedItems.Add(new BudgetFixedItem
            {
                Id = Guid.NewGuid(),
                BudgetId = id,
                Group = item.Group,
                Concept = item.Concept,
                Amount = item.Amount,
                SortOrder = item.SortOrder
            });
        }

        foreach (var commission in input.Commissions)
        {
            context.BudgetVariableCommissions.Add(new BudgetVariableCommission
            {
                Id = Guid.NewGuid(),
                BudgetId = id,
                Name = commission.Name,
                Group = commission.Group,
                Rate = commission.Rate,
                BaseAmount = commission.BaseAmount,
                SortOrder = commission.SortOrder
            });
        }

        foreach (var center in input.CostCenters)
        {
            context.BudgetCostCenters.Add(new BudgetCostCenter
            {
                Id = Guid.NewGuid(),
                BudgetId = id,
                Code = center.Code,
                Name = center.Name,
                ProductiveHours = center.ProductiveHours,
                PrestacionesFactor = center.PrestacionesFactor,
                ExtraPersonnel = center.ExtraPersonnel,
                SortOrder = center.SortOrder
            });
        }

        var settings = await context.BudgetMapSettings.FirstOrDefaultAsync(x => x.BudgetId == id);
        if (settings == null)
        {
            settings = new BudgetMapSettings { Id = Guid.NewGuid(), BudgetId = id };
            context.BudgetMapSettings.Add(settings);
        }

        settings.GeneralMfgFactor = input.MapParams.GeneralMfgFactor;
        settings.AdminFactor = input.MapParams.AdminFactor;
        settings.FinancialFactor = input.MapParams.FinancialFactor;
        settings.UtilizationPct = input.MapParams.UtilizationPct;
        settings.LayoutJson = ElliotLayoutSerializer.Serialize(BuildLayout());

        budget.UpdatedBy = "excel-presupuesto";
        budget.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        Console.WriteLine($"Presupuesto Excel cargado: {budget.Code} {budget.Company} {budget.FiscalYear}");
    }

    private static ElliotLayoutDto BuildLayout()
    {
        ElliotLayoutSectionDto Section(string id, string title, string kind, int order, params ElliotLayoutSubgroupDto[] subs) =>
            new()
            {
                Id = id,
                Title = title,
                Kind = kind,
                SortOrder = order,
                Subgroups = subs.ToList()
            };

        ElliotLayoutSubgroupDto Sub(string key, string title, int order, string? mapsTo = null) =>
            new()
            {
                Id = "sub-" + key,
                Key = key,
                Title = title,
                MapsTo = mapsTo,
                SortOrder = order
            };

        return new ElliotLayoutDto
        {
            Fixed =
            [
                Section("sec-income", "Ingresos", "income", 1),
                Section("sec-payroll", "Nómina", "payroll", 2,
                    Sub("Admin", "Administración", 1, "Admin"),
                    Sub("Sales", "Ventas", 2, "Sales"),
                    Sub("Production", "Producción", 3, "Production"),
                    Sub("Cooperative", "Cooperativa", 4, "Cooperative")),
                Section("sec-admin", "Gastos administrativos", "items", 3,
                    Sub(ElliotFixedGroups.AuxiliosAdmin, "Auxilios", 1),
                    Sub(ElliotFixedGroups.Honorarios, "Honorarios", 2),
                    Sub(ElliotFixedGroups.Impuestos, "Impuestos", 3),
                    Sub(ElliotFixedGroups.Arrendamientos, "Arrendamientos", 4),
                    Sub(ElliotFixedGroups.Contribuciones, "Contribuciones", 5),
                    Sub(ElliotFixedGroups.ServiciosAdmin, "Servicios", 6),
                    Sub(ElliotFixedGroups.GastosLegales, "Gastos legales", 7),
                    Sub(ElliotFixedGroups.MantenimientoAdmin, "Mantenimiento", 8),
                    Sub(ElliotFixedGroups.Adecuacion, "Adecuación", 9),
                    Sub(ElliotFixedGroups.ViajesAdmin, "Gastos de viaje", 10),
                    Sub(ElliotFixedGroups.DepreciacionAdmin, "Depreciación", 11),
                    Sub(ElliotFixedGroups.Diferidos, "Diferidos", 12),
                    Sub(ElliotFixedGroups.DiversosAdmin, "Diversos", 13)),
                Section("sec-sales", "Gastos de ventas", "items", 4,
                    Sub(ElliotFixedGroups.ServiciosVentas, "Servicios", 1),
                    Sub(ElliotFixedGroups.ViajesVentas, "Gastos de viaje", 2),
                    Sub(ElliotFixedGroups.ArrendamientosVentas, "Arrendamientos", 3),
                    Sub(ElliotFixedGroups.DiversosVentas, "Diversos", 4)),
                Section("sec-fin", "Gastos financieros", "items", 5,
                    Sub(ElliotFixedGroups.Financieros, "Gastos financieros", 1)),
                Section("sec-prod", "Costos de producción", "items", 6,
                    Sub(ElliotFixedGroups.AuxiliosProduccion, "Auxilios de planta", 1),
                    Sub(ElliotFixedGroups.CostosIndirectos, "Costos indirectos", 2),
                    Sub(ElliotFixedGroups.ContratosServicios, "Contratos de servicios", 3))
            ],
            Variable =
            [
                Section("sec-com", "Comisiones", "commissions", 1,
                    Sub("Cooperativa", "Vendedores cooperativa", 1),
                    Sub("Agentes", "Agentes comerciales", 2))
            ]
        };
    }
}
