using Microsoft.EntityFrameworkCore;

namespace Perlax.Modules.Almacen.Infrastructure.Persistence;

/// <summary>
/// Seed ligero post-migración. El esquema lo aplica EF (<c>MigrateAsync</c> / <c>InitialAlmacen</c>).
/// </summary>
public static class AlmacenDbInitializer
{
    public static async Task InitializeAsync(AlmacenDbContext context)
    {
        // Fila semilla del consecutivo OC (por si una DB antigua no la tenía).
        await context.Database.ExecuteSqlRawAsync("""
            INSERT INTO almacen."OrdenCompraConsecutivo" ("Id", "UltimoNumero")
            SELECT 1, 0 WHERE NOT EXISTS (SELECT 1 FROM almacen."OrdenCompraConsecutivo" WHERE "Id" = 1);
            """);
    }
}