using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations;

public partial class AddCotizadorModule : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "CalculationResultJson",
            schema: "production",
            table: "Quotations",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "FormDataJson",
            schema: "production",
            table: "Quotations",
            type: "text",
            nullable: false,
            defaultValue: "{}");

        migrationBuilder.AddColumn<string>(
            name: "PartName",
            schema: "production",
            table: "Quotations",
            type: "character varying(200)",
            maxLength: 200,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<int>(
            name: "PrimaryQuantityIndex",
            schema: "production",
            table: "Quotations",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "ProductType",
            schema: "production",
            table: "Quotations",
            type: "character varying(20)",
            maxLength: 20,
            nullable: false,
            defaultValue: "Caja");

        migrationBuilder.AddColumn<string>(
            name: "SellerName",
            schema: "production",
            table: "Quotations",
            type: "character varying(255)",
            maxLength: 255,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "WorkName",
            schema: "production",
            table: "Quotations",
            type: "character varying(500)",
            maxLength: 500,
            nullable: false,
            defaultValue: "");

        migrationBuilder.CreateTable(
            name: "CotizadorFactors",
            schema: "production",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Key = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Value = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                Description = table.Column<string>(type: "text", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table => { table.PrimaryKey("PK_CotizadorFactors", x => x.Id); });

        migrationBuilder.CreateTable(
            name: "CotizadorMachines",
            schema: "production",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                ServiceRole = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                SetupTimeHours = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                ShotsPerHour = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                HourlyRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table => { table.PrimaryKey("PK_CotizadorMachines", x => x.Id); });

        migrationBuilder.CreateTable(
            name: "CotizadorMaterials",
            schema: "production",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                PricePerM2 = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table => { table.PrimaryKey("PK_CotizadorMaterials", x => x.Id); });

        migrationBuilder.CreateTable(
            name: "CotizadorMicroFlautas",
            schema: "production",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                PricePerM2 = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table => { table.PrimaryKey("PK_CotizadorMicroFlautas", x => x.Id); });

        migrationBuilder.CreateTable(
            name: "CotizadorPlanchas",
            schema: "production",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table => { table.PrimaryKey("PK_CotizadorPlanchas", x => x.Id); });

        migrationBuilder.CreateIndex(name: "IX_CotizadorFactors_Key", schema: "production", table: "CotizadorFactors", column: "Key", unique: true);
        migrationBuilder.CreateIndex(name: "IX_CotizadorMachines_ServiceRole", schema: "production", table: "CotizadorMachines", column: "ServiceRole");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "CotizadorFactors", schema: "production");
        migrationBuilder.DropTable(name: "CotizadorMachines", schema: "production");
        migrationBuilder.DropTable(name: "CotizadorMaterials", schema: "production");
        migrationBuilder.DropTable(name: "CotizadorMicroFlautas", schema: "production");
        migrationBuilder.DropTable(name: "CotizadorPlanchas", schema: "production");
        migrationBuilder.DropColumn(name: "CalculationResultJson", schema: "production", table: "Quotations");
        migrationBuilder.DropColumn(name: "FormDataJson", schema: "production", table: "Quotations");
        migrationBuilder.DropColumn(name: "PartName", schema: "production", table: "Quotations");
        migrationBuilder.DropColumn(name: "PrimaryQuantityIndex", schema: "production", table: "Quotations");
        migrationBuilder.DropColumn(name: "ProductType", schema: "production", table: "Quotations");
        migrationBuilder.DropColumn(name: "SellerName", schema: "production", table: "Quotations");
        migrationBuilder.DropColumn(name: "WorkName", schema: "production", table: "Quotations");
    }
}