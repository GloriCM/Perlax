using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddOpSchedulingCatalogAndRoster : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
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
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS production."OpRosterDays";
                DROP TABLE IF EXISTS production."OpRosterRows";
                DROP TABLE IF EXISTS production."OpProcessCatalogItems";
                """);
        }
    }
}