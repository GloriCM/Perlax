using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations;

[DbContext(typeof(Persistence.ProductionDbContext))]
[Migration("20260917120000_AddCotizadorMaterialesCatalogs")]
public partial class AddCotizadorMaterialesCatalogs : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS production."CotizadorBarnices" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "Name" character varying(200) NOT NULL,
                "Factor" numeric(18,6) NOT NULL,
                "IsActive" boolean NOT NULL DEFAULT TRUE,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NULL
            );
            CREATE TABLE IF NOT EXISTS production."CotizadorTerminados" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "Name" character varying(200) NOT NULL,
                "PricePerM2" numeric(18,2) NOT NULL,
                "IsActive" boolean NOT NULL DEFAULT TRUE,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NULL
            );
            CREATE TABLE IF NOT EXISTS production."CotizadorCordones" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "Name" character varying(200) NOT NULL,
                "PricePerManija" numeric(18,2) NOT NULL,
                "IsActive" boolean NOT NULL DEFAULT TRUE,
                "CreatedAt" timestamp with time zone NOT NULL,
                "UpdatedAt" timestamp with time zone NULL
            );
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS production."CotizadorCordones";
            DROP TABLE IF EXISTS production."CotizadorTerminados";
            DROP TABLE IF EXISTS production."CotizadorBarnices";
            """);
    }
}
