using System.Data;
using Microsoft.EntityFrameworkCore;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

public static class DesignPlannerSchemaFixes
{
    public static async Task ApplyAsync(ProductionDbContext context)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await context.Database.OpenConnectionAsync();

        try
        {
            await ExecuteAsync(connection, """
                DO $fix$
                DECLARE
                    r record;
                BEGIN
                    FOR r IN
                        SELECT n.nspname AS schema_name
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relkind = 'r'
                          AND c.relname = 'DesignPlannerJobs'
                    LOOP
                        EXECUTE format(
                            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS %I character varying(4000) NOT NULL DEFAULT %L',
                            r.schema_name, 'DesignPlannerJobs', 'Accion', '');
                        EXECUTE format(
                            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS %I text NOT NULL DEFAULT %L',
                            r.schema_name, 'DesignPlannerJobs', 'ProcesoJson', '{}');
                        EXECUTE format(
                            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS %I character varying(255) NOT NULL DEFAULT %L',
                            r.schema_name, 'DesignPlannerJobs', 'CreatedBy', '');
                        EXECUTE format(
                            'UPDATE %I.%I SET %I = COALESCE(NULLIF(TRIM(%I), %L), %L) WHERE TRIM(COALESCE(%I, %L)) = %L',
                            r.schema_name, 'DesignPlannerJobs', 'CreatedBy', 'UpdatedBy', '', 'desconocido', 'CreatedBy', '', '');
                    END LOOP;
                END
                $fix$;
                """);

            var found = await ReadColumnsAsync(connection);
            Console.WriteLine("DesignPlannerJobs columns: " + string.Join(", ", found));
            if (!found.Contains("ProcesoJson", StringComparer.Ordinal))
                throw new InvalidOperationException("No se pudo crear production.DesignPlannerJobs.ProcesoJson.");
            if (!found.Contains("CreatedBy", StringComparer.Ordinal))
                throw new InvalidOperationException("No se pudo crear production.DesignPlannerJobs.CreatedBy.");
        }
        finally
        {
            if (shouldClose)
                await context.Database.CloseConnectionAsync();
        }
    }

    private static async Task ExecuteAsync(System.Data.Common.DbConnection connection, string sql)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<List<string>> ReadColumnsAsync(System.Data.Common.DbConnection connection)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'DesignPlannerJobs'
              AND column_name IN ('Accion', 'ProcesoJson', 'CreatedBy')
            ORDER BY table_schema, column_name;
            """;
        var found = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            found.Add(reader.GetString(0));
        return found;
    }
}
