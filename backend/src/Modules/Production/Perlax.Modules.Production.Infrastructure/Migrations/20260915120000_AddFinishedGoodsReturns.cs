using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddFinishedGoodsReturns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS production."FinishedGoodsReturns" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "ReturnNumber" character varying(30) NOT NULL,
                    "ManufacturingOrderId" uuid NOT NULL,
                    "RemisionId" uuid NULL,
                    "RemisionItemId" uuid NULL,
                    "OpNumber" character varying(20) NOT NULL,
                    "ClientName" character varying(255) NOT NULL,
                    "ProductName" character varying(500) NOT NULL,
                    "ReferenceName" character varying(200) NOT NULL,
                    "Quantity" numeric(18,2) NOT NULL,
                    "ReturnDate" timestamp with time zone NOT NULL,
                    "Reason" character varying(255) NULL,
                    "Notes" text NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    CONSTRAINT "FK_FinishedGoodsReturns_ManufacturingOrders"
                        FOREIGN KEY ("ManufacturingOrderId")
                        REFERENCES production."ManufacturingOrders" ("Id") ON DELETE RESTRICT,
                    CONSTRAINT "FK_FinishedGoodsReturns_Remisiones"
                        FOREIGN KEY ("RemisionId")
                        REFERENCES production."Remisiones" ("Id") ON DELETE SET NULL
                );

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_ReturnNumber"
                    ON production."FinishedGoodsReturns" ("ReturnNumber");
                CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_ManufacturingOrderId"
                    ON production."FinishedGoodsReturns" ("ManufacturingOrderId");
                CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsReturns_RemisionItemId"
                    ON production."FinishedGoodsReturns" ("RemisionItemId");
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""DROP TABLE IF EXISTS production."FinishedGoodsReturns";""");
        }
    }
}
