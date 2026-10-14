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
        await AlmacenProductoSeed.ApplyAsync(context);
        await EnsureProductoForeignKeysAsync(context);
    }

    /// <summary>
    /// La requisición, el consumo y el saldo apuntan al producto del inventario.
    /// El id queda vacío si el texto no corresponde a ningún producto.
    /// </summary>
    private static async Task EnsureProductoForeignKeysAsync(AlmacenDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            UPDATE almacen."Requisiciones" AS r
            SET "ProductoId" = p."Id"
            FROM almacen."Productos" AS p
            WHERE r."ProductoId" IS NULL
              AND lower(btrim(r."ProductoNombre")) = lower(btrim(p."Nombre"));

            UPDATE almacen."Requisiciones" AS r
            SET "ProductoId" = NULL
            WHERE r."ProductoId" IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM almacen."Productos" AS p WHERE p."Id" = r."ProductoId");
            """);

        await context.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'FK_Requisiciones_Productos_ProductoId'
                ) THEN
                    ALTER TABLE almacen."Requisiciones"
                    ADD CONSTRAINT "FK_Requisiciones_Productos_ProductoId"
                    FOREIGN KEY ("ProductoId") REFERENCES almacen."Productos"("Id")
                    ON DELETE RESTRICT;
                END IF;
            END $$;
            """);

        await LinkProductionProductAsync(context, "WarehouseStockMovements");
        await LinkProductionProductAsync(context, "InventoryConsumptions");
        await LinkProductionProductAsync(context, "OpMaterialLines");
    }

    private static Task LinkProductionProductAsync(AlmacenDbContext context, string table)
    {
        var constraint = $"FK_{table}_Productos_ProductId";
        return context.Database.ExecuteSqlRawAsync($"""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'production' AND table_name = '{table}'
                ) THEN
                    UPDATE production."{table}" AS m
                    SET "ProductId" = p."Id"
                    FROM almacen."Productos" AS p
                    WHERE m."ProductId" IS NULL
                      AND lower(btrim(m."ProductName")) = lower(btrim(p."Nombre"));

                    UPDATE production."{table}" AS m
                    SET "ProductId" = NULL
                    WHERE m."ProductId" IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM almacen."Productos" AS p WHERE p."Id" = m."ProductId"
                      );

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = '{constraint}'
                    ) THEN
                        ALTER TABLE production."{table}"
                        ADD CONSTRAINT "{constraint}"
                        FOREIGN KEY ("ProductId") REFERENCES almacen."Productos"("Id")
                        ON DELETE RESTRICT;
                    END IF;
                END IF;
            END $$;
            """);
    }
}