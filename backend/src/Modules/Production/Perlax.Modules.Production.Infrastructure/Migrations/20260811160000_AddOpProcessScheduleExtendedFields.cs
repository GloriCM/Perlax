using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddOpProcessScheduleExtendedFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
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
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."OpProcessSchedules" DROP COLUMN IF EXISTS "EstimatedHours";
                ALTER TABLE production."OpProcessSchedules" DROP COLUMN IF EXISTS "IsUrgency";
                """);
        }
    }
}