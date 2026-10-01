using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace Perlax.Modules.Budgets.Infrastructure.Persistence;

/// <summary>
/// DDL idempotente para el modelo Elliot (costos fijos / variables / mapa).
/// Complementa migraciones EF cuando la tabla aún no existe en el entorno.
/// </summary>
public static class ElliotBudgetsSchemaFixes
{
    public static async Task ApplyAsync(BudgetsDbContext context, CancellationToken ct = default)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await context.Database.OpenConnectionAsync(ct);

        try
        {
            await ExecuteAsync(connection, """
                CREATE TABLE IF NOT EXISTS budgets."BudgetIncomeLines" (
                    "Id" uuid NOT NULL,
                    "BudgetId" uuid NOT NULL,
                    "Code" character varying(40) NOT NULL,
                    "Name" character varying(255) NOT NULL,
                    "Amount" numeric(18,2) NOT NULL,
                    "MaterialPct" numeric(9,6) NOT NULL,
                    "SortOrder" integer NOT NULL,
                    CONSTRAINT "PK_BudgetIncomeLines" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_BudgetIncomeLines_Budgets_BudgetId"
                        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
                )
                """, ct);

            await ExecuteAsync(connection, """
                CREATE TABLE IF NOT EXISTS budgets."BudgetPayrollPeople" (
                    "Id" uuid NOT NULL,
                    "BudgetId" uuid NOT NULL,
                    "Section" character varying(40) NOT NULL,
                    "Name" character varying(255) NOT NULL,
                    "Role" character varying(255) NOT NULL,
                    "Salary" numeric(18,2) NOT NULL,
                    "TransportSubsidy" numeric(18,2) NOT NULL,
                    "CostCenterCode" character varying(40) NULL,
                    "SortOrder" integer NOT NULL,
                    CONSTRAINT "PK_BudgetPayrollPeople" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_BudgetPayrollPeople_Budgets_BudgetId"
                        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
                )
                """, ct);

            await ExecuteAsync(connection, """
                CREATE TABLE IF NOT EXISTS budgets."BudgetFixedItems" (
                    "Id" uuid NOT NULL,
                    "BudgetId" uuid NOT NULL,
                    "Group" character varying(80) NOT NULL,
                    "Concept" character varying(255) NOT NULL,
                    "Amount" numeric(18,2) NOT NULL,
                    "SortOrder" integer NOT NULL,
                    CONSTRAINT "PK_BudgetFixedItems" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_BudgetFixedItems_Budgets_BudgetId"
                        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
                )
                """, ct);

            await ExecuteAsync(connection, """
                CREATE TABLE IF NOT EXISTS budgets."BudgetVariableCommissions" (
                    "Id" uuid NOT NULL,
                    "BudgetId" uuid NOT NULL,
                    "Name" character varying(255) NOT NULL,
                    "Group" character varying(80) NOT NULL,
                    "Rate" numeric(9,6) NOT NULL,
                    "BaseAmount" numeric(18,2) NOT NULL,
                    "SortOrder" integer NOT NULL,
                    CONSTRAINT "PK_BudgetVariableCommissions" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_BudgetVariableCommissions_Budgets_BudgetId"
                        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
                )
                """, ct);

            await ExecuteAsync(connection, """
                CREATE TABLE IF NOT EXISTS budgets."BudgetCostCenters" (
                    "Id" uuid NOT NULL,
                    "BudgetId" uuid NOT NULL,
                    "Code" character varying(40) NOT NULL,
                    "Name" character varying(255) NOT NULL,
                    "ProductiveHours" numeric(18,2) NOT NULL,
                    "SortOrder" integer NOT NULL,
                    CONSTRAINT "PK_BudgetCostCenters" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_BudgetCostCenters_Budgets_BudgetId"
                        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
                )
                """, ct);

            await ExecuteAsync(connection, """
                CREATE TABLE IF NOT EXISTS budgets."BudgetMapSettings" (
                    "Id" uuid NOT NULL,
                    "BudgetId" uuid NOT NULL,
                    "GeneralMfgFactor" numeric(9,6) NOT NULL,
                    "AdminFactor" numeric(9,6) NOT NULL,
                    "FinancialFactor" numeric(9,6) NOT NULL,
                    "UtilizationPct" numeric(9,6) NOT NULL,
                    CONSTRAINT "PK_BudgetMapSettings" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_BudgetMapSettings_Budgets_BudgetId"
                        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
                )
                """, ct);

            await ExecuteAsync(connection,
                """CREATE INDEX IF NOT EXISTS "IX_BudgetIncomeLines_BudgetId" ON budgets."BudgetIncomeLines" ("BudgetId")""", ct);
            await ExecuteAsync(connection,
                """CREATE INDEX IF NOT EXISTS "IX_BudgetPayrollPeople_BudgetId_Section" ON budgets."BudgetPayrollPeople" ("BudgetId", "Section")""", ct);
            await ExecuteAsync(connection,
                """CREATE INDEX IF NOT EXISTS "IX_BudgetFixedItems_BudgetId_Group" ON budgets."BudgetFixedItems" ("BudgetId", "Group")""", ct);
            await ExecuteAsync(connection,
                """CREATE INDEX IF NOT EXISTS "IX_BudgetVariableCommissions_BudgetId" ON budgets."BudgetVariableCommissions" ("BudgetId")""", ct);
            await ExecuteAsync(connection,
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_BudgetCostCenters_BudgetId_Code" ON budgets."BudgetCostCenters" ("BudgetId", "Code")""", ct);
            await ExecuteAsync(connection,
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_BudgetMapSettings_BudgetId" ON budgets."BudgetMapSettings" ("BudgetId")""", ct);

            // Marcar migración en historial si aún no está (evita que EF intente crearla de nuevo).
            await ExecuteAsync(connection, """
                INSERT INTO budgets."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                SELECT '20260920120000_AddElliotBudgetModel', '9.0.0'
                WHERE NOT EXISTS (
                    SELECT 1 FROM budgets."__EFMigrationsHistory"
                    WHERE "MigrationId" = '20260920120000_AddElliotBudgetModel'
                )
                """, ct);
        }
        finally
        {
            if (shouldClose && connection.State == ConnectionState.Open)
                await context.Database.CloseConnectionAsync();
        }
    }

    private static async Task ExecuteAsync(DbConnection connection, string sql, CancellationToken ct)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
