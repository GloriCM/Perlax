using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddDesignPlannerCreatedBy : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."DesignPlannerJobs"
                ADD COLUMN IF NOT EXISTS "CreatedBy" character varying(255) NOT NULL DEFAULT '';

                UPDATE production."DesignPlannerJobs"
                SET "CreatedBy" = COALESCE(NULLIF(TRIM("UpdatedBy"), ''), 'desconocido')
                WHERE TRIM(COALESCE("CreatedBy", '')) = '';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."DesignPlannerJobs"
                DROP COLUMN IF EXISTS "CreatedBy";
                """);
        }
    }
}
