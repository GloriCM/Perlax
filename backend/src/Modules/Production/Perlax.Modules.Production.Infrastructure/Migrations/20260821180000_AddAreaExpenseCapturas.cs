using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddAreaExpenseCapturas : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS production."AreaExpenseCapturas" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "Area" character varying(40) NOT NULL,
                    "ExpenseDate" date NOT NULL,
                    "RubroId" uuid NULL,
                    "RubroName" character varying(200) NOT NULL,
                    "ProveedorId" uuid NULL,
                    "ProveedorName" character varying(200) NOT NULL DEFAULT '',
                    "Invoice" character varying(120) NULL,
                    "OpNumber" character varying(120) NULL,
                    "Description" text NULL,
                    "BaseAmount" numeric(18,2) NOT NULL DEFAULT 0,
                    "IvaAmount" numeric(18,2) NOT NULL DEFAULT 0,
                    "TotalAmount" numeric(18,2) NOT NULL DEFAULT 0,
                    "Status" character varying(40) NOT NULL DEFAULT 'pendiente',
                    "RegisteredBy" character varying(200) NOT NULL DEFAULT '',
                    "OvertimeGroupId" uuid NULL,
                    "OvertimeJson" text NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "UpdatedAt" timestamp with time zone NULL
                );

                CREATE INDEX IF NOT EXISTS "IX_AreaExpenseCapturas_Area_ExpenseDate"
                    ON production."AreaExpenseCapturas" ("Area", "ExpenseDate");

                CREATE INDEX IF NOT EXISTS "IX_AreaExpenseCapturas_Area_RubroName"
                    ON production."AreaExpenseCapturas" ("Area", "RubroName");

                CREATE INDEX IF NOT EXISTS "IX_AreaExpenseCapturas_OvertimeGroupId"
                    ON production."AreaExpenseCapturas" ("OvertimeGroupId");
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS production."AreaExpenseCapturas";
                """);
        }
    }
}
