using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddDesignPlannerProcesoJson : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."DesignPlannerJobs"
                ADD COLUMN IF NOT EXISTS "ProcesoJson" text NOT NULL DEFAULT (chr(123) || chr(125));
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."DesignPlannerJobs"
                DROP COLUMN IF EXISTS "ProcesoJson";
                """);
        }
    }
}
