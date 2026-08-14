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

        await context.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'OpProcessSchedules'
                      AND column_name = 'IsUrgency'
                ) THEN
                    ALTER TABLE production."OpProcessSchedules"
                    ADD COLUMN "IsUrgency" boolean NOT NULL DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'OpProcessSchedules'
                      AND column_name = 'EstimatedHours'
                ) THEN
                    ALTER TABLE production."OpProcessSchedules"
                    ADD COLUMN "EstimatedHours" numeric(18,4) NULL;
                END IF;
            END $$;
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS production."OpProcessCatalogItems" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "Code" character varying(50) NOT NULL,
                "Label" character varying(100) NOT NULL,
                "SortOrder" integer NOT NULL DEFAULT 0,
                "IsActive" boolean NOT NULL DEFAULT TRUE,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "CreatedBy" character varying(255) NULL,
                "UpdatedAt" timestamp with time zone NULL,
                "UpdatedBy" character varying(255) NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_OpProcessCatalogItems_Code"
                ON production."OpProcessCatalogItems" ("Code");
            CREATE INDEX IF NOT EXISTS "IX_OpProcessCatalogItems_SortOrder"
                ON production."OpProcessCatalogItems" ("SortOrder");

            CREATE TABLE IF NOT EXISTS production."OpRosterRows" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "WeekStart" timestamp with time zone NOT NULL,
                "ProcessCode" character varying(50) NOT NULL,
                "MachineId" uuid NULL,
                "OperatorId" uuid NULL,
                "RoleTag" character varying(10) NOT NULL DEFAULT 'Op',
                "SortOrder" integer NOT NULL DEFAULT 0,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "CreatedBy" character varying(255) NULL,
                "UpdatedAt" timestamp with time zone NULL,
                "UpdatedBy" character varying(255) NULL
            );
            CREATE INDEX IF NOT EXISTS "IX_OpRosterRows_WeekStart"
                ON production."OpRosterRows" ("WeekStart");
            CREATE INDEX IF NOT EXISTS "IX_OpRosterRows_WeekStart_SortOrder"
                ON production."OpRosterRows" ("WeekStart", "SortOrder");

            CREATE TABLE IF NOT EXISTS production."OpRosterDays" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "RosterRowId" uuid NOT NULL REFERENCES production."OpRosterRows"("Id") ON DELETE CASCADE,
                "DayOfWeek" integer NOT NULL,
                "ShiftId" uuid NULL,
                "IsOff" boolean NOT NULL DEFAULT FALSE
            );
            CREATE INDEX IF NOT EXISTS "IX_OpRosterDays_RosterRowId"
                ON production."OpRosterDays" ("RosterRowId");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_OpRosterDays_RosterRowId_DayOfWeek"
                ON production."OpRosterDays" ("RosterRowId", "DayOfWeek");
            """);

        await context.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'production' AND table_name = 'ProductionMachines'
                      AND column_name = 'ProcessCode'
                ) THEN
                    ALTER TABLE production."ProductionMachines"
                    ADD COLUMN "ProcessCode" character varying(50) NULL;
                END IF;
            END $$;

            UPDATE production."ProductionMachines"
            SET "ProcessCode" = 'Conversion'
            WHERE "ProcessCode" IS NULL AND UPPER("Name") LIKE '%CONVERT%';

            UPDATE production."ProductionMachines"
            SET "ProcessCode" = 'Impresion'
            WHERE "ProcessCode" IS NULL AND (UPPER("Name") LIKE '%SPEED%' OR UPPER("Name") LIKE '%IMPRES%');

            UPDATE production."ProductionMachines"
            SET "ProcessCode" = 'Colaminado'
            WHERE "ProcessCode" IS NULL AND UPPER("Name") LIKE '%COLAMIN%';

            UPDATE production."ProductionMachines"
            SET "ProcessCode" = 'Corrugacion'
            WHERE "ProcessCode" IS NULL AND UPPER("Name") LIKE '%CORRUG%';

            UPDATE production."ProductionMachines"
            SET "ProcessCode" = 'Troquelado'
            WHERE "ProcessCode" IS NULL AND UPPER("Name") LIKE '%TROQUEL%';

            CREATE TABLE IF NOT EXISTS production."ProductionMachineShifts" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "MachineId" uuid NOT NULL,
                "ShiftId" uuid NOT NULL REFERENCES production."ProductionShifts"("Id") ON DELETE CASCADE,
                "IsEnabled" boolean NOT NULL DEFAULT TRUE,
                "SortOrder" integer NOT NULL DEFAULT 0
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_ProductionMachineShifts_MachineId_ShiftId"
                ON production."ProductionMachineShifts" ("MachineId", "ShiftId");
            CREATE INDEX IF NOT EXISTS "IX_ProductionMachineShifts_MachineId"
                ON production."ProductionMachineShifts" ("MachineId");

            CREATE TABLE IF NOT EXISTS production."OpCoverageAssignments" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "WeekStart" timestamp with time zone NOT NULL,
                "MachineId" uuid NOT NULL,
                "DayOfWeek" integer NOT NULL,
                "ShiftId" uuid NOT NULL REFERENCES production."ProductionShifts"("Id") ON DELETE CASCADE,
                "OperatorId" uuid NOT NULL,
                "RoleTag" character varying(10) NOT NULL DEFAULT 'Op',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "CreatedBy" character varying(255) NULL
            );
            CREATE INDEX IF NOT EXISTS "IX_OpCoverageAssignments_WeekStart_MachineId"
                ON production."OpCoverageAssignments" ("WeekStart", "MachineId");
            CREATE INDEX IF NOT EXISTS "IX_OpCoverageAssignments_WeekStart_MachineId_DayOfWeek_ShiftId"
                ON production."OpCoverageAssignments" ("WeekStart", "MachineId", "DayOfWeek", "ShiftId");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_OpCoverageAssignments_Unique"
                ON production."OpCoverageAssignments" ("WeekStart", "MachineId", "DayOfWeek", "ShiftId", "RoleTag", "OperatorId");

            CREATE TABLE IF NOT EXISTS production."OpBillingMonthGoals" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "Year" integer NOT NULL,
                "Month" integer NOT NULL,
                "MonthlyGoal" numeric(18,2) NOT NULL DEFAULT 0,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "CreatedBy" character varying(255) NULL,
                "UpdatedAt" timestamp with time zone NULL,
                "UpdatedBy" character varying(255) NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_OpBillingMonthGoals_Year_Month"
                ON production."OpBillingMonthGoals" ("Year", "Month");
            """);

        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE production."OrderParts"
            ADD COLUMN IF NOT EXISTS "LegacyImportJson" text NULL;
            """);
    }
}