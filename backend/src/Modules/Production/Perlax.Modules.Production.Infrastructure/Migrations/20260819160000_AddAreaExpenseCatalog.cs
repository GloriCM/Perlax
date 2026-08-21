using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddAreaExpenseCatalog : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS production."AreaExpenseRubros" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "Area" character varying(40) NOT NULL,
                    "Name" character varying(200) NOT NULL,
                    "SortOrder" integer NOT NULL DEFAULT 0,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW()
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_AreaExpenseRubros_Area_Name"
                    ON production."AreaExpenseRubros" ("Area", "Name");

                CREATE TABLE IF NOT EXISTS production."AreaExpenseProveedores" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "Area" character varying(40) NOT NULL,
                    "Name" character varying(200) NOT NULL,
                    "Nit" character varying(50) NULL,
                    "Cedula" character varying(30) NULL,
                    "Telefono" character varying(40) NULL,
                    "Asesor" character varying(200) NULL,
                    "RubrosJson" text NOT NULL DEFAULT '[]',
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "UpdatedAt" timestamp with time zone NULL
                );
                CREATE INDEX IF NOT EXISTS "IX_AreaExpenseProveedores_Area_Name"
                    ON production."AreaExpenseProveedores" ("Area", "Name");

                ALTER TABLE production."AreaExpenseProveedores"
                ADD COLUMN IF NOT EXISTS "Cedula" character varying(30) NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS production."AreaExpenseProveedores";
                DROP TABLE IF EXISTS production."AreaExpenseRubros";
                """);
        }
    }
}