using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AlignCustomerOrderDeliveryDateColumn : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'production'
          AND table_name = 'CustomerOrders'
          AND column_name = 'ExpectedDispatchDate'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'production'
              AND table_name = 'CustomerOrders'
              AND column_name = 'AgreedDeliveryDate'
        ) THEN
            UPDATE production.""CustomerOrders""
            SET ""AgreedDeliveryDate"" = COALESCE(""AgreedDeliveryDate"", ""ExpectedDispatchDate"")
            WHERE ""AgreedDeliveryDate"" IS NULL;

            ALTER TABLE production.""CustomerOrders""
            DROP COLUMN ""ExpectedDispatchDate"";
        ELSE
            ALTER TABLE production.""CustomerOrders""
            RENAME COLUMN ""ExpectedDispatchDate"" TO ""AgreedDeliveryDate"";
        END IF;
    END IF;
END $$;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'production'
          AND table_name = 'CustomerOrders'
          AND column_name = 'AgreedDeliveryDate'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'production'
          AND table_name = 'CustomerOrders'
          AND column_name = 'ExpectedDispatchDate'
    ) THEN
        ALTER TABLE production.""CustomerOrders""
        RENAME COLUMN ""AgreedDeliveryDate"" TO ""ExpectedDispatchDate"";
    END IF;
END $$;
");
        }
    }
}