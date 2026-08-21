using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Budgets.Domain.Entities;

namespace Perlax.Modules.Budgets.Infrastructure.Persistence;

public static class BudgetsDbSeeder
{
    public static async Task SeedAsync(BudgetsDbContext context)
    {
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
    }
}
