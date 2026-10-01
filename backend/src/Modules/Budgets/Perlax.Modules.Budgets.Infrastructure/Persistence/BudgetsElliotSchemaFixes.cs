using System.Data;
using Microsoft.EntityFrameworkCore;

namespace Perlax.Modules.Budgets.Infrastructure.Persistence;

/// <summary>
/// DDL idempotente: schema, historial EF y tablas Elliot/base.
/// Evita fallos de MigrateAsync cuando no existe budgets.__EFMigrationsHistory.
/// </summary>
public static class BudgetsElliotSchemaFixes
{
    public static async Task ApplyAsync(BudgetsDbContext context, CancellationToken ct = default)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await context.Database.OpenConnectionAsync(ct);

        try
        {
            await Exec(connection, """CREATE SCHEMA IF NOT EXISTS budgets;""");

            await Exec(connection, """
                CREATE TABLE IF NOT EXISTS budgets."__EFMigrationsHistory" (
                    "MigrationId" character varying(150) NOT NULL,
                    "ProductVersion" character varying(32) NOT NULL,
                    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
                );
                """);

            // Si las tablas base ya existen pero el historial estaba vacío, no reintentar Initial.
            await Exec(connection, """
                INSERT INTO budgets."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                SELECT '20260715143955_InitialBudgetsModule', '9.0.0'
                WHERE EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'budgets' AND table_name = 'Budgets'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM budgets."__EFMigrationsHistory"
                    WHERE "MigrationId" = '20260715143955_InitialBudgetsModule'
                );
                """);

            await EnsureCoreBudgetTablesAsync(connection);
            await EnsureElliotTablesAsync(connection);

            await Exec(connection, """
                INSERT INTO budgets."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                SELECT '20260920120000_AddElliotBudgetModel', '9.0.0'
                WHERE EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'budgets' AND table_name = 'BudgetIncomeLines'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM budgets."__EFMigrationsHistory"
                    WHERE "MigrationId" = '20260920120000_AddElliotBudgetModel'
                );
                """);
        }
        finally
        {
            if (shouldClose && connection.State == ConnectionState.Open)
                await context.Database.CloseConnectionAsync();
        }
    }

    private static async Task EnsureCoreBudgetTablesAsync(System.Data.Common.DbConnection connection)
    {
        // Solo por si el schema quedó a medias; IF NOT EXISTS no toca datos.
        await Exec(connection, """
            CREATE TABLE IF NOT EXISTS budgets."Budgets" (
                "Id" uuid NOT NULL,
                "Code" character varying(40) NOT NULL,
                "Company" character varying(255) NOT NULL,
                "FiscalYear" integer NOT NULL,
                "StartDate" timestamp with time zone NOT NULL,
                "EndDate" timestamp with time zone NOT NULL,
                "CostCenter" character varying(100) NULL,
                "Currency" character varying(10) NOT NULL,
                "Status" character varying(40) NOT NULL,
                "GeneralApprover" character varying(255) NULL,
                "GeneralApprovalDate" timestamp with time zone NULL,
                "ApprovalObservations" character varying(4000) NULL,
                "RejectionReason" character varying(4000) NULL,
                "Observations" character varying(4000) NOT NULL,
                "CreatedBy" character varying(255) NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedBy" character varying(255) NULL,
                "UpdatedAt" timestamp with time zone NULL,
                CONSTRAINT "PK_Budgets" PRIMARY KEY ("Id")
            );
            """);
    }

    private static async Task EnsureElliotTablesAsync(System.Data.Common.DbConnection connection)
    {
        await Exec(connection, """
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
            );
            """);
        await Exec(connection, """CREATE INDEX IF NOT EXISTS "IX_BudgetIncomeLines_BudgetId" ON budgets."BudgetIncomeLines" ("BudgetId");""");

        await Exec(connection, """
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
            );
            """);
        await Exec(connection, """CREATE INDEX IF NOT EXISTS "IX_BudgetPayrollPeople_BudgetId_Section" ON budgets."BudgetPayrollPeople" ("BudgetId", "Section");""");

        await Exec(connection, """
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
            );
            """);
        await Exec(connection, """CREATE INDEX IF NOT EXISTS "IX_BudgetFixedItems_BudgetId_Group" ON budgets."BudgetFixedItems" ("BudgetId", "Group");""");

        await Exec(connection, """
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
            );
            """);
        await Exec(connection, """CREATE INDEX IF NOT EXISTS "IX_BudgetVariableCommissions_BudgetId" ON budgets."BudgetVariableCommissions" ("BudgetId");""");

        await Exec(connection, """
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
            );
            """);
        await Exec(connection, """CREATE UNIQUE INDEX IF NOT EXISTS "IX_BudgetCostCenters_BudgetId_Code" ON budgets."BudgetCostCenters" ("BudgetId", "Code");""");

            await Exec(connection, """
                CREATE TABLE IF NOT EXISTS budgets."BudgetMapSettings" (
                    "Id" uuid NOT NULL,
                    "BudgetId" uuid NOT NULL,
                    "GeneralMfgFactor" numeric(9,6) NOT NULL,
                    "AdminFactor" numeric(9,6) NOT NULL,
                    "FinancialFactor" numeric(9,6) NOT NULL,
                    "UtilizationPct" numeric(9,6) NOT NULL,
                    "LayoutJson" text NULL,
                    CONSTRAINT "PK_BudgetMapSettings" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_BudgetMapSettings_Budgets_BudgetId"
                        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
                );
                """);
            await Exec(connection, """CREATE UNIQUE INDEX IF NOT EXISTS "IX_BudgetMapSettings_BudgetId" ON budgets."BudgetMapSettings" ("BudgetId");""");
            await Exec(connection, """ALTER TABLE budgets."BudgetMapSettings" ADD COLUMN IF NOT EXISTS "LayoutJson" text NULL;""");
            await Exec(connection, """ALTER TABLE budgets."BudgetCostCenters" ADD COLUMN IF NOT EXISTS "PrestacionesFactor" numeric(9,6) NOT NULL DEFAULT 0.5;""");
            await Exec(connection, """ALTER TABLE budgets."BudgetCostCenters" ADD COLUMN IF NOT EXISTS "ExtraPersonnel" numeric(18,2) NOT NULL DEFAULT 0;""");
    }

    private static async Task Exec(System.Data.Common.DbConnection connection, string sql)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync();
    }
}
