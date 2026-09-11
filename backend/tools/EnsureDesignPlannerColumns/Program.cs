using System.Text.Json;
using Npgsql;

var settingsPath = @"e:\Semillas\Perlax\backend\src\Host\Perlax.Web\appsettings.Development.local.json";

if (!File.Exists(settingsPath))
{
    Console.Error.WriteLine("No se encontro appsettings.Development.local.json");
    return 1;
}

using var doc = JsonDocument.Parse(File.ReadAllText(settingsPath));
var cs = doc.RootElement.GetProperty("ConnectionStrings").GetProperty("ProductionConnection").GetString();
if (string.IsNullOrWhiteSpace(cs))
{
    Console.Error.WriteLine("ProductionConnection vacia.");
    return 1;
}

await using var connection = new NpgsqlConnection(cs);
await connection.OpenAsync();

await using (var cmd = connection.CreateCommand())
{
    cmd.CommandText = """
        ALTER TABLE IF EXISTS production."DesignPlannerJobs"
        ADD COLUMN IF NOT EXISTS "Accion" character varying(4000) NOT NULL DEFAULT '';
        """;
    await cmd.ExecuteNonQueryAsync();
}

await using (var cmd = connection.CreateCommand())
{
    cmd.CommandText = """
        ALTER TABLE IF EXISTS production."DesignPlannerJobs"
        ADD COLUMN IF NOT EXISTS "ProcesoJson" text NOT NULL DEFAULT (chr(123) || chr(125));
        """;
    await cmd.ExecuteNonQueryAsync();
}

await using (var cmd = connection.CreateCommand())
{
    cmd.CommandText = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'production'
          AND table_name = 'DesignPlannerJobs'
          AND column_name IN ('Accion', 'ProcesoJson')
        ORDER BY column_name;
        """;
    await using var reader = await cmd.ExecuteReaderAsync();
    var found = new List<string>();
    while (await reader.ReadAsync())
        found.Add(reader.GetString(0));
    Console.WriteLine("Columnas: " + string.Join(", ", found));
    if (!found.Contains("ProcesoJson"))
    {
        Console.Error.WriteLine("ProcesoJson sigue ausente.");
        return 2;
    }
}

Console.WriteLine("ProcesoJson listo.");
return 0;
