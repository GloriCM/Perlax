using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTechnicalSheetApprovalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTechnicalSheetApproved",
                schema: "production",
                table: "OrderParts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "TechnicalSheetApprovedAt",
                schema: "production",
                table: "OrderParts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalSheetApprovedBy",
                schema: "production",
                table: "OrderParts",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsTechnicalSheetApproved",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "TechnicalSheetApprovedAt",
                schema: "production",
                table: "OrderParts");

            migrationBuilder.DropColumn(
                name: "TechnicalSheetApprovedBy",
                schema: "production",
                table: "OrderParts");
        }
    }
}
