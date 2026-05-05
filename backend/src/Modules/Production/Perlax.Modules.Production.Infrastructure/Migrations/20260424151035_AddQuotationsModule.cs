using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotationsModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Quotations",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuoteNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SourceType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ProductionOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProductionOrderNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ClientName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ProspectClientName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ProductName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RequestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FreightType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    QuantitiesJson = table.Column<string>(type: "text", nullable: false),
                    TabsDataJson = table.Column<string>(type: "text", nullable: false),
                    CostValidationJson = table.Column<string>(type: "text", nullable: true),
                    SelectedPriceTier = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    SelectedUnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    DeliveryConditions = table.Column<string>(type: "text", nullable: false),
                    PriceConditions = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quotations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Quotations_ProductionOrderId",
                schema: "production",
                table: "Quotations",
                column: "ProductionOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Quotations_QuoteNumber",
                schema: "production",
                table: "Quotations",
                column: "QuoteNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Quotations",
                schema: "production");
        }
    }
}
