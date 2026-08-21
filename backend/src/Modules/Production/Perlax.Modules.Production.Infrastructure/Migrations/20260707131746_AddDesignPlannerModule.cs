using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDesignPlannerModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DesignPlannerJobs",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JobNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Cliente = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Vendedor = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Trabajo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Responsable = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Estado = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaRecepcion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FechaEntrega = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Requerimientos = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    FichaAprobada = table.Column<bool>(type: "boolean", nullable: false),
                    FechaAprobacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ComentariosAprobacion = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    HistorialJson = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DesignPlannerJobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DesignPlannerActivities",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DesignPlannerJobId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FechaEnvio = table.Column<DateOnly>(type: "date", nullable: false),
                    FechaRecepcion = table.Column<DateOnly>(type: "date", nullable: true),
                    Repeticiones = table.Column<int>(type: "integer", nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Completada = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DesignPlannerActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DesignPlannerActivities_DesignPlannerJobs_DesignPlannerJobId",
                        column: x => x.DesignPlannerJobId,
                        principalSchema: "production",
                        principalTable: "DesignPlannerJobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DesignPlannerActivities_DesignPlannerJobId",
                schema: "production",
                table: "DesignPlannerActivities",
                column: "DesignPlannerJobId");

            migrationBuilder.CreateIndex(
                name: "IX_DesignPlannerJobs_Estado",
                schema: "production",
                table: "DesignPlannerJobs",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_DesignPlannerJobs_FechaEntrega",
                schema: "production",
                table: "DesignPlannerJobs",
                column: "FechaEntrega");

            migrationBuilder.CreateIndex(
                name: "IX_DesignPlannerJobs_JobNumber",
                schema: "production",
                table: "DesignPlannerJobs",
                column: "JobNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DesignPlannerJobs_Responsable",
                schema: "production",
                table: "DesignPlannerJobs",
                column: "Responsable");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DesignPlannerActivities",
                schema: "production");

            migrationBuilder.DropTable(
                name: "DesignPlannerJobs",
                schema: "production");
        }
    }
}
