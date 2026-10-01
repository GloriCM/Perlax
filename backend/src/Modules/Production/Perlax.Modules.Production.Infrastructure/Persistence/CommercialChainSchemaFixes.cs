using System.Data;
using Microsoft.EntityFrameworkCore;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

/// <summary>
/// Idempotent DDL for commercial chain (remisión/factura/PT/OP detail).
/// Statements run one-by-one so a later failure does not roll back ClosedAt / columnas OP.
/// </summary>
public static class CommercialChainSchemaFixes
{
    public static async Task ApplyAsync(ProductionDbContext context)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await context.Database.OpenConnectionAsync();

        try
        {
            // Critical columns first — every ManufacturingOrders query needs these.
            await EnsureManufacturingOrderColumnsAsync(context);
            await EnsureCustomerLinkColumnsAsync(context);
            // ... remaining tables use same connection after ensure re-opens as needed
            await EnsureTablesAsync(connection);

            var cols = await ReadManufacturingOrderColumnsAsync(connection);
            Console.WriteLine("ManufacturingOrders commercial columns: " + string.Join(", ", cols));
            if (!cols.Contains("ClosedAt", StringComparer.Ordinal))
                throw new InvalidOperationException("No se pudo crear production.ManufacturingOrders.ClosedAt.");
        }
        finally
        {
            if (shouldClose && connection.State == ConnectionState.Open)
                await context.Database.CloseConnectionAsync();
        }
    }

    /// <summary>
    /// Idempotent: CustomerId FK columns on OT / pedidos / OP.
    /// </summary>
    public static async Task EnsureCustomerLinkColumnsAsync(ProductionDbContext context, CancellationToken ct = default)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await context.Database.OpenConnectionAsync(ct);

        try
        {
            await ExecuteAsync(connection, """
                ALTER TABLE IF EXISTS production."ProductionOrders"
                    ADD COLUMN IF NOT EXISTS "CustomerId" uuid NULL
                """);
            await ExecuteAsync(connection, """
                ALTER TABLE IF EXISTS production."CustomerOrders"
                    ADD COLUMN IF NOT EXISTS "CustomerId" uuid NULL
                """);
            await ExecuteAsync(connection, """
                ALTER TABLE IF EXISTS production."ManufacturingOrders"
                    ADD COLUMN IF NOT EXISTS "CustomerId" uuid NULL
                """);
            await ExecuteAsync(connection, """
                CREATE INDEX IF NOT EXISTS "IX_ProductionOrders_CustomerId"
                    ON production."ProductionOrders" ("CustomerId")
                """);
            await ExecuteAsync(connection, """
                CREATE INDEX IF NOT EXISTS "IX_CustomerOrders_CustomerId"
                    ON production."CustomerOrders" ("CustomerId")
                """);
            await ExecuteAsync(connection, """
                CREATE INDEX IF NOT EXISTS "IX_ManufacturingOrders_CustomerId"
                    ON production."ManufacturingOrders" ("CustomerId")
                """);
        }
        finally
        {
            if (shouldClose && connection.State == ConnectionState.Open)
                await context.Database.CloseConnectionAsync();
        }
    }

    /// <summary>
    /// Idempotent: adds ClosedAt / ClosedBy / ProductionDeliveryDate if missing.
    /// Safe to call from startup and from report endpoints (self-heal).
    /// Uses ADO.NET so it works even when EF metadata is stale.
    /// </summary>
    public static async Task EnsureManufacturingOrderColumnsAsync(ProductionDbContext context, CancellationToken ct = default)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await context.Database.OpenConnectionAsync(ct);

        try
        {
            await ExecuteAsync(connection, """
                ALTER TABLE IF EXISTS production."ManufacturingOrders"
                    ADD COLUMN IF NOT EXISTS "ClosedAt" timestamp with time zone NULL
                """);
            await ExecuteAsync(connection, """
                ALTER TABLE IF EXISTS production."ManufacturingOrders"
                    ADD COLUMN IF NOT EXISTS "ClosedBy" character varying(255) NULL
                """);
            await ExecuteAsync(connection, """
                ALTER TABLE IF EXISTS production."ManufacturingOrders"
                    ADD COLUMN IF NOT EXISTS "ProductionDeliveryDate" timestamp with time zone NULL
                """);

            var cols = await ReadManufacturingOrderColumnsAsync(connection);
            if (!cols.Contains("ClosedAt", StringComparer.Ordinal))
            {
                // Table may live without schema prefix in some envs
                await ExecuteAsync(connection, """
                    ALTER TABLE IF EXISTS "ManufacturingOrders"
                        ADD COLUMN IF NOT EXISTS "ClosedAt" timestamp with time zone NULL
                    """);
                await ExecuteAsync(connection, """
                    ALTER TABLE IF EXISTS "ManufacturingOrders"
                        ADD COLUMN IF NOT EXISTS "ClosedBy" character varying(255) NULL
                    """);
                await ExecuteAsync(connection, """
                    ALTER TABLE IF EXISTS "ManufacturingOrders"
                        ADD COLUMN IF NOT EXISTS "ProductionDeliveryDate" timestamp with time zone NULL
                    """);
                cols = await ReadManufacturingOrderColumnsAsync(connection);
            }

            if (!cols.Contains("ClosedAt", StringComparer.Ordinal))
                throw new InvalidOperationException(
                    "No se pudo asegurar la columna ClosedAt en ManufacturingOrders. Revise permisos DDL en PostgreSQL.");
        }
        finally
        {
            if (shouldClose && connection.State == ConnectionState.Open)
                await context.Database.CloseConnectionAsync();
        }
    }

    private static async Task EnsureTablesAsync(System.Data.Common.DbConnection connection)
    {
        foreach (var sql in TableStatements)
        {
            try
            {
                await ExecuteAsync(connection, sql);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CommercialChainSchemaFixes statement skipped/failed: {ex.Message}");
            }
        }
    }

    private static readonly string[] TableStatements =
    [
        """
        CREATE TABLE IF NOT EXISTS production."Customers" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "Name" character varying(255) NOT NULL,
            "Nit" character varying(50) NULL,
            "ContactName" character varying(255) NULL,
            "Phone" character varying(60) NULL,
            "Email" character varying(255) NULL,
            "Address" character varying(500) NULL,
            "ReceiptPercentage" numeric(5,2) NOT NULL DEFAULT 10,
            "IsActive" boolean NOT NULL DEFAULT TRUE,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL,
            "UpdatedAt" timestamp with time zone NULL,
            "UpdatedBy" character varying(255) NULL
        )
        """,
        """CREATE UNIQUE INDEX IF NOT EXISTS "IX_Customers_Name" ON production."Customers" ("Name")""",

        """
        CREATE TABLE IF NOT EXISTS production."Remisiones" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "RemisionNumber" character varying(30) NOT NULL,
            "CustomerOrderId" uuid NOT NULL,
            "CustomerOrderNumber" character varying(20) NOT NULL,
            "ClientName" character varying(255) NOT NULL,
            "RemisionDate" timestamp with time zone NOT NULL,
            "Status" character varying(40) NOT NULL,
            "Notes" text NULL,
            "HasTransport" boolean NOT NULL DEFAULT FALSE,
            "TransportCarrier" character varying(200) NULL,
            "TransportPlate" character varying(40) NULL,
            "TransportDriver" character varying(200) NULL,
            "TransportCost" numeric(18,2) NOT NULL DEFAULT 0,
            "TransportNotes" text NULL,
            "InvoiceId" uuid NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL,
            "UpdatedAt" timestamp with time zone NULL,
            "UpdatedBy" character varying(255) NULL
        )
        """,
        """CREATE UNIQUE INDEX IF NOT EXISTS "IX_Remisiones_RemisionNumber" ON production."Remisiones" ("RemisionNumber")""",
        """CREATE INDEX IF NOT EXISTS "IX_Remisiones_CustomerOrderId" ON production."Remisiones" ("CustomerOrderId")""",
        """CREATE INDEX IF NOT EXISTS "IX_Remisiones_ClientName" ON production."Remisiones" ("ClientName")""",

        """
        CREATE TABLE IF NOT EXISTS production."RemisionItems" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "RemisionId" uuid NOT NULL,
            "CustomerOrderItemId" uuid NOT NULL,
            "ManufacturingOrderId" uuid NULL,
            "OrderPartId" uuid NOT NULL,
            "ProductionOrderId" uuid NOT NULL,
            "ProductName" character varying(500) NOT NULL,
            "ReferenceName" character varying(200) NOT NULL,
            "Quantity" numeric(18,2) NOT NULL,
            "UnitPrice" numeric(18,2) NOT NULL DEFAULT 0,
            "DispatchNotes" text NULL,
            "IsFinalDispatch" boolean NOT NULL DEFAULT FALSE,
            "FinalDispatchCode" character varying(20) NULL
        )
        """,
        """CREATE INDEX IF NOT EXISTS "IX_RemisionItems_RemisionId" ON production."RemisionItems" ("RemisionId")""",
        """CREATE INDEX IF NOT EXISTS "IX_RemisionItems_CustomerOrderItemId" ON production."RemisionItems" ("CustomerOrderItemId")""",
        """CREATE INDEX IF NOT EXISTS "IX_RemisionItems_ManufacturingOrderId" ON production."RemisionItems" ("ManufacturingOrderId")""",

        """
        CREATE TABLE IF NOT EXISTS production."SalesInvoices" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "InvoiceNumber" character varying(30) NOT NULL,
            "LegacyInvoiceNumber" character varying(30) NULL,
            "RemisionId" uuid NOT NULL,
            "RemisionNumber" character varying(30) NOT NULL,
            "ClientName" character varying(255) NOT NULL,
            "InvoiceDate" timestamp with time zone NOT NULL,
            "DueDate" timestamp with time zone NULL,
            "Status" character varying(40) NOT NULL,
            "Notes" text NULL,
            "Subtotal" numeric(18,2) NOT NULL DEFAULT 0,
            "TaxAmount" numeric(18,2) NOT NULL DEFAULT 0,
            "TotalAmount" numeric(18,2) NOT NULL DEFAULT 0,
            "TaxRate" numeric(5,2) NOT NULL DEFAULT 19,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL,
            "UpdatedAt" timestamp with time zone NULL,
            "UpdatedBy" character varying(255) NULL,
            "VoidedAt" timestamp with time zone NULL,
            "VoidedBy" character varying(255) NULL
        )
        """,
        """CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalesInvoices_InvoiceNumber" ON production."SalesInvoices" ("InvoiceNumber")""",
        """CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalesInvoices_RemisionId" ON production."SalesInvoices" ("RemisionId")""",

        """
        CREATE TABLE IF NOT EXISTS production."SalesInvoiceItems" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "SalesInvoiceId" uuid NOT NULL,
            "RemisionItemId" uuid NOT NULL,
            "ProductName" character varying(500) NOT NULL,
            "ReferenceName" character varying(200) NOT NULL,
            "Quantity" numeric(18,2) NOT NULL,
            "UnitPrice" numeric(18,2) NOT NULL,
            "LineTotal" numeric(18,2) NOT NULL
        )
        """,
        """CREATE INDEX IF NOT EXISTS "IX_SalesInvoiceItems_SalesInvoiceId" ON production."SalesInvoiceItems" ("SalesInvoiceId")""",

        """
        CREATE TABLE IF NOT EXISTS production."FinishedGoodsEntries" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "ManufacturingOrderId" uuid NOT NULL,
            "EntryDate" timestamp with time zone NOT NULL,
            "Quantity" numeric(18,2) NOT NULL,
            "Notes" text NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL
        )
        """,
        """CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsEntries_ManufacturingOrderId" ON production."FinishedGoodsEntries" ("ManufacturingOrderId")""",

        """
        CREATE TABLE IF NOT EXISTS production."FinishedGoodsReturns" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "ReturnNumber" character varying(30) NOT NULL,
            "ManufacturingOrderId" uuid NOT NULL,
            "RemisionId" uuid NULL,
            "RemisionItemId" uuid NULL,
            "OpNumber" character varying(20) NOT NULL,
            "ClientName" character varying(255) NOT NULL,
            "ProductName" character varying(500) NOT NULL,
            "ReferenceName" character varying(200) NOT NULL,
            "Quantity" numeric(18,2) NOT NULL,
            "ReturnDate" timestamp with time zone NOT NULL,
            "Reason" character varying(255) NULL,
            "Notes" text NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL
        )
        """,
        """CREATE UNIQUE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_ReturnNumber" ON production."FinishedGoodsReturns" ("ReturnNumber")""",
        """CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_ManufacturingOrderId" ON production."FinishedGoodsReturns" ("ManufacturingOrderId")""",
        """CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_RemisionItemId" ON production."FinishedGoodsReturns" ("RemisionItemId")""",

        """
        CREATE TABLE IF NOT EXISTS production."OpMaterialLines" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "ManufacturingOrderId" uuid NOT NULL,
            "PartName" character varying(200) NOT NULL,
            "Category" character varying(80) NOT NULL,
            "ProductId" uuid NULL,
            "ProductName" character varying(500) NOT NULL,
            "Quantity" numeric(18,4) NOT NULL,
            "Unit" character varying(40) NOT NULL,
            "UnitCost" numeric(18,2) NOT NULL DEFAULT 0,
            "Notes" text NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL
        )
        """,
        """CREATE INDEX IF NOT EXISTS "IX_OpMaterialLines_ManufacturingOrderId" ON production."OpMaterialLines" ("ManufacturingOrderId")""",

        """
        CREATE TABLE IF NOT EXISTS production."OpLaborProcesses" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "ManufacturingOrderId" uuid NOT NULL,
            "PartName" character varying(200) NOT NULL,
            "WorkStation" character varying(200) NOT NULL,
            "Observations" text NULL,
            "Quantity" numeric(18,4) NOT NULL DEFAULT 0,
            "RollWidth" numeric(18,4) NULL,
            "CutLength" numeric(18,4) NULL,
            "SheetWidth" numeric(18,4) NULL,
            "SheetLength" numeric(18,4) NULL,
            "Cabida" numeric(18,4) NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL
        )
        """,
        """CREATE INDEX IF NOT EXISTS "IX_OpLaborProcesses_ManufacturingOrderId" ON production."OpLaborProcesses" ("ManufacturingOrderId")""",

        """
        CREATE TABLE IF NOT EXISTS production."OpExternalWorkshops" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "ManufacturingOrderId" uuid NOT NULL,
            "WorkshopName" character varying(200) NOT NULL,
            "WorkType" character varying(200) NOT NULL DEFAULT '',
            "DeliveryToWorkshopDate" timestamp with time zone NULL,
            "QuantityDelivered" numeric(18,2) NOT NULL DEFAULT 0,
            "Fajado" numeric(18,2) NOT NULL DEFAULT 0,
            "Estresado" numeric(18,2) NOT NULL DEFAULT 0,
            "Empacado" numeric(18,2) NOT NULL DEFAULT 0,
            "UnitPrice" numeric(18,2) NOT NULL,
            "Observations" text NULL,
            "ReturnDate" timestamp with time zone NULL,
            "ReturnQuantity" numeric(18,2) NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL
        )
        """,
        """CREATE INDEX IF NOT EXISTS "IX_OpExternalWorkshops_ManufacturingOrderId" ON production."OpExternalWorkshops" ("ManufacturingOrderId")""",

        """
        CREATE TABLE IF NOT EXISTS production."InventoryConsumptions" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "ApplicationNumber" character varying(30) NOT NULL,
            "ManufacturingOrderId" uuid NOT NULL,
            "OpNumber" character varying(20) NOT NULL,
            "ProductId" uuid NULL,
            "ProductName" character varying(500) NOT NULL,
            "Quantity" numeric(18,4) NOT NULL,
            "Unit" character varying(40) NOT NULL,
            "UnitCost" numeric(18,2) NOT NULL DEFAULT 0,
            "DeliveredTo" character varying(255) NOT NULL,
            "ApplicationDate" timestamp with time zone NOT NULL,
            "Notes" text NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL,
            "UpdatedAt" timestamp with time zone NULL,
            "UpdatedBy" character varying(255) NULL
        )
        """,
        """CREATE UNIQUE INDEX IF NOT EXISTS "IX_InventoryConsumptions_ApplicationNumber" ON production."InventoryConsumptions" ("ApplicationNumber")""",
        """CREATE INDEX IF NOT EXISTS "IX_InventoryConsumptions_ManufacturingOrderId" ON production."InventoryConsumptions" ("ManufacturingOrderId")""",

        """
        CREATE TABLE IF NOT EXISTS production."WarehouseStockMovements" (
            "Id" uuid NOT NULL PRIMARY KEY,
            "ProductId" uuid NULL,
            "ProductName" character varying(500) NOT NULL,
            "MovementType" character varying(20) NOT NULL,
            "Quantity" numeric(18,4) NOT NULL,
            "UnitCost" numeric(18,2) NOT NULL DEFAULT 0,
            "Reference" character varying(100) NULL,
            "ManufacturingOrderId" uuid NULL,
            "ConsumptionId" uuid NULL,
            "MovementDate" timestamp with time zone NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
            "CreatedBy" character varying(255) NULL
        )
        """,
        """CREATE INDEX IF NOT EXISTS "IX_WarehouseStockMovements_ProductName" ON production."WarehouseStockMovements" ("ProductName")""",
        """CREATE INDEX IF NOT EXISTS "IX_WarehouseStockMovements_MovementDate" ON production."WarehouseStockMovements" ("MovementDate")""",
        """CREATE INDEX IF NOT EXISTS "IX_WarehouseStockMovements_ConsumptionId" ON production."WarehouseStockMovements" ("ConsumptionId")""",
    ];

    /// <summary>
    /// Idempotent: creates FinishedGoodsReturns if missing (devoluciones PT).
    /// ADO.NET (same pattern as EnsureManufacturingOrderColumnsAsync) so DDL commits
    /// even when EF ExecuteSqlRaw runs inside a failed/aborted transaction.
    /// </summary>
    public static async Task EnsureFinishedGoodsReturnsAsync(ProductionDbContext context, CancellationToken ct = default)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await context.Database.OpenConnectionAsync(ct);

        try
        {
            await ExecuteAsync(connection, """CREATE SCHEMA IF NOT EXISTS production""");
            await ExecuteAsync(connection, """
                CREATE TABLE IF NOT EXISTS production."FinishedGoodsReturns" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "ReturnNumber" character varying(30) NOT NULL,
                    "ManufacturingOrderId" uuid NOT NULL,
                    "RemisionId" uuid NULL,
                    "RemisionItemId" uuid NULL,
                    "OpNumber" character varying(20) NOT NULL,
                    "ClientName" character varying(255) NOT NULL,
                    "ProductName" character varying(500) NOT NULL,
                    "ReferenceName" character varying(200) NOT NULL,
                    "Quantity" numeric(18,2) NOT NULL,
                    "ReturnDate" timestamp with time zone NOT NULL,
                    "Reason" character varying(255) NULL,
                    "Notes" text NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL
                )
                """);
            await ExecuteAsync(connection, """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_ReturnNumber"
                    ON production."FinishedGoodsReturns" ("ReturnNumber")
                """);
            await ExecuteAsync(connection, """
                CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_ManufacturingOrderId"
                    ON production."FinishedGoodsReturns" ("ManufacturingOrderId")
                """);
            await ExecuteAsync(connection, """
                CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_RemisionItemId"
                    ON production."FinishedGoodsReturns" ("RemisionItemId")
                """);

            if (!await TableExistsAsync(connection, "production", "FinishedGoodsReturns"))
                throw new InvalidOperationException(
                    "No se pudo crear production.FinishedGoodsReturns. Revise permisos DDL en PostgreSQL.");
        }
        finally
        {
            if (shouldClose && connection.State == ConnectionState.Open)
                await context.Database.CloseConnectionAsync();
        }
    }

    private static async Task<bool> TableExistsAsync(
        System.Data.Common.DbConnection connection,
        string schema,
        string table)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = @schema AND table_name = @table
            LIMIT 1
            """;
        var pSchema = cmd.CreateParameter();
        pSchema.ParameterName = "schema";
        pSchema.Value = schema;
        cmd.Parameters.Add(pSchema);
        var pTable = cmd.CreateParameter();
        pTable.ParameterName = "table";
        pTable.Value = table;
        cmd.Parameters.Add(pTable);
        var result = await cmd.ExecuteScalarAsync();
        return result != null && result != DBNull.Value;
    }

    private static async Task ExecuteAsync(System.Data.Common.DbConnection connection, string sql)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<List<string>> ReadManufacturingOrderColumnsAsync(System.Data.Common.DbConnection connection)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'ManufacturingOrders'
              AND column_name IN ('ClosedAt', 'ClosedBy', 'ProductionDeliveryDate')
              AND table_schema IN ('production', 'public', current_schema())
            ORDER BY column_name;
            """;
        var found = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            found.Add(reader.GetString(0));
        return found.Distinct(StringComparer.Ordinal).ToList();
    }
}
