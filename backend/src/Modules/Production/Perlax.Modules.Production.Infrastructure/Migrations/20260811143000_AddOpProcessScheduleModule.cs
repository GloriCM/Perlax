using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddOpProcessScheduleModule : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
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

            migrationBuilder.Sql("""
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

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OpProcessSchedules",
                schema: "production");
        }
    }
}