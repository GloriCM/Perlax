using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddManufacturingOrdersModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ManufacturingOrders",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OpNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CustomerOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderPartId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductionOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    OtNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ClientName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ProductName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ReferenceName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PurchaseOrderNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AgreedDeliveryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    QuantityOrdered = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ReceiptPercentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    QuantityToProduce = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ApprovedUnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OpeningDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OpenedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManufacturingOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManufacturingOrders_CustomerOrders_CustomerOrderId",
                        column: x => x.CustomerOrderId,
                        principalSchema: "production",
                        principalTable: "CustomerOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ManufacturingOrders_CustomerOrderId",
                schema: "production",
                table: "ManufacturingOrders",
                column: "CustomerOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ManufacturingOrders_CustomerOrderId_OrderPartId",
                schema: "production",
                table: "ManufacturingOrders",
                columns: new[] { "CustomerOrderId", "OrderPartId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ManufacturingOrders_OpeningDate",
                schema: "production",
                table: "ManufacturingOrders",
                column: "OpeningDate");

            migrationBuilder.CreateIndex(
                name: "IX_ManufacturingOrders_OpNumber",
                schema: "production",
                table: "ManufacturingOrders",
                column: "OpNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ManufacturingOrders_OrderPartId",
                schema: "production",
                table: "ManufacturingOrders",
                column: "OrderPartId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ManufacturingOrders",
                schema: "production");
        }
    }
}
