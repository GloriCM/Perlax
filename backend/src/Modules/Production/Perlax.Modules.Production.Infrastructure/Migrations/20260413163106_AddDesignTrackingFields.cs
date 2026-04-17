using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDesignTrackingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Disenador",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EstadoAprobacion",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EstadoArtes",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EstadoBoceto",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EstadoFicha",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EstadoFotomecanica",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EstadoMuestra",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EstadoPlancha",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Prioridad",
                schema: "production",
                table: "OrderParts",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Disenador",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "EstadoAprobacion",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "EstadoArtes",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "EstadoBoceto",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "EstadoFicha",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "EstadoFotomecanica",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "EstadoMuestra",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "EstadoPlancha",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "Prioridad",
                schema: "production",
                table: "OrderParts");
        }
    }
}
