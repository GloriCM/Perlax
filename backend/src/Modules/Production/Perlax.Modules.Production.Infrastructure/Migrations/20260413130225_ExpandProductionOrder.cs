using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExpandProductionOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlannedQuantity",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "ProducedQuantity",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "ScheduledStart",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                schema: "production",
                table: "ProductionOrders",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "ProductName",
                schema: "production",
                table: "ProductionOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "ProductCode",
                schema: "production",
                table: "ProductionOrders",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "production",
                table: "ProductionOrders",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                schema: "production",
                table: "ProductionOrders",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AddColumn<string>(
                name: "Asignacion",
                schema: "production",
                table: "ProductionOrders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Cliente",
                schema: "production",
                table: "ProductionOrders",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "production",
                table: "ProductionOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EjecutivoCuenta",
                schema: "production",
                table: "ProductionOrders",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaSolicitud",
                schema: "production",
                table: "ProductionOrders",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "LineaPT",
                schema: "production",
                table: "ProductionOrders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "NumeroPartes",
                schema: "production",
                table: "ProductionOrders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "OTNumber",
                schema: "production",
                table: "ProductionOrders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                schema: "production",
                table: "ProductionOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                schema: "production",
                table: "ProductionOrders",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OrderParts",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductionOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SustratoSup = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SustratoMed = table.Column<string>(type: "text", nullable: true),
                    SustratoInf = table.Column<string>(type: "text", nullable: true),
                    DireccionFibra = table.Column<string>(type: "text", nullable: true),
                    TipoFlauta = table.Column<string>(type: "text", nullable: true),
                    DireccionFlauta = table.Column<string>(type: "text", nullable: true),
                    Alto = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Largo = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Ancho = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Fuelle = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TroquelNuevo = table.Column<bool>(type: "boolean", nullable: false),
                    CodigoTroquel = table.Column<string>(type: "text", nullable: true),
                    TintaC = table.Column<bool>(type: "boolean", nullable: false),
                    TintaM = table.Column<bool>(type: "boolean", nullable: false),
                    TintaY = table.Column<bool>(type: "boolean", nullable: false),
                    TintaK = table.Column<bool>(type: "boolean", nullable: false),
                    TintasEspeciales = table.Column<string>(type: "text", nullable: true),
                    Terminado1 = table.Column<string>(type: "text", nullable: true),
                    Terminado2 = table.Column<string>(type: "text", nullable: true),
                    Estampado = table.Column<bool>(type: "boolean", nullable: false),
                    PieImprenta = table.Column<string>(type: "text", nullable: true),
                    Notas = table.Column<string>(type: "text", nullable: true),
                    AdjuntosJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderParts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderParts_ProductionOrders_ProductionOrderId",
                        column: x => x.ProductionOrderId,
                        principalSchema: "production",
                        principalTable: "ProductionOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderParts_ProductionOrderId",
                schema: "production",
                table: "OrderParts",
                column: "ProductionOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderParts",
                schema: "production");

            migrationBuilder.DropColumn(
                name: "Asignacion",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "Cliente",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "EjecutivoCuenta",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "FechaSolicitud",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "LineaPT",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "NumeroPartes",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "OTNumber",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                schema: "production",
                table: "ProductionOrders");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                schema: "production",
                table: "ProductionOrders",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "ProductName",
                schema: "production",
                table: "ProductionOrders",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "ProductCode",
                schema: "production",
                table: "ProductionOrders",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "CreatedAt",
                schema: "production",
                table: "ProductionOrders",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Id",
                schema: "production",
                table: "ProductionOrders",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<int>(
                name: "PlannedQuantity",
                schema: "production",
                table: "ProductionOrders",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ProducedQuantity",
                schema: "production",
                table: "ProductionOrders",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ScheduledStart",
                schema: "production",
                table: "ProductionOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }
    }
}
