using Microsoft.EntityFrameworkCore;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

/// <summary>
/// Alinea tablas legacy de pedidos cliente con el modelo EF actual.
/// Idempotente: seguro ejecutar en cada arranque.
/// </summary>
public static class ProductionDbInitializer
{
    public static async Task InitializeAsync(ProductionDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            CREATE SCHEMA IF NOT EXISTS production;

            CREATE TABLE IF NOT EXISTS production."CustomerOrders" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "OrderNumber" character varying(20) NOT NULL,
                "OrderDate" timestamp with time zone NOT NULL,
                "ClientName" character varying(255) NOT NULL,
                "PurchaseOrderNumber" character varying(100) NOT NULL,
                "AgreedDeliveryDate" timestamp with time zone NULL,
                "Status" character varying(50) NOT NULL DEFAULT 'Pendiente',
                "IsApproved" boolean NOT NULL DEFAULT FALSE,
                "ApprovedAt" timestamp with time zone NULL,
                "ApprovedBy" character varying(255) NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "CreatedBy" character varying(255) NULL,
                "UpdatedAt" timestamp with time zone NULL,
                "UpdatedBy" character varying(255) NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_CustomerOrders_OrderNumber"
                ON production."CustomerOrders" ("OrderNumber");

            CREATE TABLE IF NOT EXISTS production."CustomerOrderItems" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "CustomerOrderId" uuid NOT NULL REFERENCES production."CustomerOrders"("Id") ON DELETE CASCADE,
                "ProductionOrderId" uuid NOT NULL,
                "OrderPartId" uuid NOT NULL,
                "Quantity" numeric(18,2) NOT NULL,
                "ApprovedUnitPrice" numeric(18,2) NOT NULL DEFAULT 0,
                "ProductName" character varying(500) NOT NULL DEFAULT '',
                "ReferenceName" character varying(200) NOT NULL DEFAULT ''
            );

            CREATE INDEX IF NOT EXISTS "IX_CustomerOrderItems_CustomerOrderId"
                ON production."CustomerOrderItems" ("CustomerOrderId");

            CREATE INDEX IF NOT EXISTS "IX_CustomerOrderItems_OrderPartId"
                ON production."CustomerOrderItems" ("OrderPartId");

            CREATE INDEX IF NOT EXISTS "IX_CustomerOrderItems_ProductionOrderId"
                ON production."CustomerOrderItems" ("ProductionOrderId");
            """);

        await context.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'ExpectedDispatchDate'
                ) THEN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                          AND column_name = 'AgreedDeliveryDate'
                    ) THEN
                        UPDATE production."CustomerOrders"
                        SET "AgreedDeliveryDate" = COALESCE("AgreedDeliveryDate", "ExpectedDispatchDate")
                        WHERE "AgreedDeliveryDate" IS NULL;

                        ALTER TABLE production."CustomerOrders" DROP COLUMN "ExpectedDispatchDate";
                    ELSE
                        ALTER TABLE production."CustomerOrders"
                        RENAME COLUMN "ExpectedDispatchDate" TO "AgreedDeliveryDate";
                    END IF;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'AgreedDeliveryDate'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "AgreedDeliveryDate" timestamp with time zone NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'Status'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "Status" character varying(50) NOT NULL DEFAULT 'Pendiente';
                ELSE
                    UPDATE production."CustomerOrders"
                    SET "Status" = CASE WHEN "IsApproved" THEN 'Aprobado' ELSE 'Pendiente' END
                    WHERE "Status" IS NULL OR BTRIM("Status") = '';

                    ALTER TABLE production."CustomerOrders"
                    ALTER COLUMN "Status" SET DEFAULT 'Pendiente';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'IsApproved'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "IsApproved" boolean NOT NULL DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'ApprovedAt'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "ApprovedAt" timestamp with time zone NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'ApprovedBy'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "ApprovedBy" character varying(255) NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'PurchaseOrderNumber'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "PurchaseOrderNumber" character varying(100) NOT NULL DEFAULT '';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'CreatedAt'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW();
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'CreatedBy'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "CreatedBy" character varying(255) NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'UpdatedAt'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "UpdatedAt" timestamp with time zone NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrders'
                      AND column_name = 'UpdatedBy'
                ) THEN
                    ALTER TABLE production."CustomerOrders"
                    ADD COLUMN "UpdatedBy" character varying(255) NULL;
                END IF;
            END $$;
            """);

        await context.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrderItems'
                      AND column_name = 'ProductionOrderId'
                ) THEN
                    ALTER TABLE production."CustomerOrderItems"
                    ADD COLUMN "ProductionOrderId" uuid NULL;
                END IF;

                UPDATE production."CustomerOrderItems" coi
                SET "ProductionOrderId" = op."ProductionOrderId"
                FROM production."OrderParts" op
                WHERE coi."OrderPartId" = op."Id"
                  AND coi."ProductionOrderId" IS NULL;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'CustomerOrderItems'
                      AND column_name = 'ProductionOrderId'
                ) THEN
                    ALTER TABLE production."CustomerOrderItems"
                    ALTER COLUMN "ProductionOrderId" SET NOT NULL;
                END IF;
            END $$;
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS production."OpProcessSchedules" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "ManufacturingOrderId" uuid NULL,
                "ProcessCode" character varying(50) NOT NULL,
                "MachineId" uuid NULL,
                "BlockType" character varying(30) NOT NULL DEFAULT 'Op',
                "PlannedStart" timestamp with time zone NOT NULL,
                "PlannedEnd" timestamp with time zone NOT NULL,
                "Status" character varying(30) NOT NULL DEFAULT 'Programado',
                "SortOrder" integer NOT NULL DEFAULT 0,
                "Notes" character varying(2000) NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "CreatedBy" character varying(255) NULL,
                "UpdatedAt" timestamp with time zone NULL,
                "UpdatedBy" character varying(255) NULL
            );

            CREATE INDEX IF NOT EXISTS "IX_OpProcessSchedules_ManufacturingOrderId"
                ON production."OpProcessSchedules" ("ManufacturingOrderId");

            CREATE INDEX IF NOT EXISTS "IX_OpProcessSchedules_PlannedEnd"
                ON production."OpProcessSchedules" ("PlannedEnd");

            CREATE INDEX IF NOT EXISTS "IX_OpProcessSchedules_PlannedStart"
                ON production."OpProcessSchedules" ("PlannedStart");

            CREATE INDEX IF NOT EXISTS "IX_OpProcessSchedules_ProcessCode"
                ON production."OpProcessSchedules" ("ProcessCode");
            """);

        await context.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'production' AND table_name = 'ManufacturingOrders'
                ) AND NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'FK_OpProcessSchedules_ManufacturingOrders_ManufacturingOrderId'
                ) THEN
                    ALTER TABLE production."OpProcessSchedules"
                    ADD CONSTRAINT "FK_OpProcessSchedules_ManufacturingOrders_ManufacturingOrderId"
                    FOREIGN KEY ("ManufacturingOrderId")
                    REFERENCES production."ManufacturingOrders"("Id")
                    ON DELETE CASCADE;
                END IF;
            END $$;
            """);
    }
}