using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddOrderPartLegacyImportJson : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."OrderParts"
                ADD COLUMN IF NOT EXISTS "LegacyImportJson" text NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."OrderParts"
                DROP COLUMN IF EXISTS "LegacyImportJson";
                """);
        }
    }
}