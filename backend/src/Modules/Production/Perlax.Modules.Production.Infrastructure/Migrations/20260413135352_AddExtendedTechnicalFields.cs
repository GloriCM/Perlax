using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExtendedTechnicalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Fuelle",
                schema: "production",
                table: "OrderParts",
                newName: "ManijaLargo");

            migrationBuilder.AddColumn<decimal>(
                name: "AltoPliego",
                schema: "production",
                table: "OrderParts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "AnchoPliego",
                schema: "production",
                table: "OrderParts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Cabida",
                schema: "production",
                table: "OrderParts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CondicionCertificado",
                schema: "production",
                table: "OrderParts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CondicionFactura",
                schema: "production",
                table: "OrderParts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CondicionOrdenCompra",
                schema: "production",
                table: "OrderParts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CondicionRemision",
                schema: "production",
                table: "OrderParts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FabricationProcessesJson",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManijaRef",
                schema: "production",
                table: "OrderParts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManijaTipo",
                schema: "production",
                table: "OrderParts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AltoPliego",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "AnchoPliego",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "Cabida",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "CondicionCertificado",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "CondicionFactura",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "CondicionOrdenCompra",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "CondicionRemision",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "FabricationProcessesJson",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "ManijaRef",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "ManijaTipo",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.RenameColumn(
                name: "ManijaLargo",
                schema: "production",
                table: "OrderParts",
                newName: "Fuelle");
        }
    }
}
