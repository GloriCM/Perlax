using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

internal static class AdvisoryLock
{
    public static async Task AcquireAsync(DbContext db, string key, int slot, CancellationToken ct)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);

        await using var cmd = connection.CreateCommand();
        cmd.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();
        cmd.CommandText = "SELECT pg_advisory_xact_lock(hashtextextended(@k, @n))";

        var name = cmd.CreateParameter();
        name.ParameterName = "k";
        name.DbType = DbType.String;
        name.Value = key;
        cmd.Parameters.Add(name);

        var space = cmd.CreateParameter();
        space.ParameterName = "n";
        space.DbType = DbType.Int64;
        space.Value = (long)slot;
        cmd.Parameters.Add(space);

        await cmd.ExecuteScalarAsync(ct);
    }
}
