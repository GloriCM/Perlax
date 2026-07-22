using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyProductionModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductionActivityCodes",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RequiresOrder = table.Column<bool>(type: "boolean", nullable: false),
                    AllowsProductionQty = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionActivityCodes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductionMachines",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionMachines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductionOperators",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionOperators", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductionShifts",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    CrossesMidnight = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionShifts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductionWasteReasons",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RequiresObservation = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionWasteReasons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductionActivitySubcodes",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityCodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RequiresObservation = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionActivitySubcodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductionActivitySubcodes_ProductionActivityCodes_Activity~",
                        column: x => x.ActivityCodeId,
                        principalSchema: "production",
                        principalTable: "ProductionActivityCodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductionSessions",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OperationalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MachineId = table.Column<Guid>(type: "uuid", nullable: false),
                    MachineCodeSnapshot = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MachineNameSnapshot = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OperatorId = table.Column<Guid>(type: "uuid", nullable: false),
                    OperatorCodeSnapshot = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OperatorNameSnapshot = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftCodeSnapshot = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Source = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    MetaTiros = table.Column<int>(type: "integer", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PausedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PausedSecondsAccumulated = table.Column<int>(type: "integer", nullable: false),
                    CurrentActivityId = table.Column<Guid>(type: "uuid", nullable: true),
                    CurrentActivityCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CurrentActivityName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CurrentOp = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IdempotencyKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ConcurrencyStamp = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductionSessions_ProductionMachines_MachineId",
                        column: x => x.MachineId,
                        principalSchema: "production",
                        principalTable: "ProductionMachines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductionSessions_ProductionOperators_OperatorId",
                        column: x => x.OperatorId,
                        principalSchema: "production",
                        principalTable: "ProductionOperators",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductionSessions_ProductionShifts_ShiftId",
                        column: x => x.ShiftId,
                        principalSchema: "production",
                        principalTable: "ProductionShifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductionActivities",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    OperationalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ActivityCodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityCodeSnapshot = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ActivityNameSnapshot = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SubcodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubcodeSnapshot = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    SubcodeDetailSnapshot = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ProductionOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProductionOrderNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StartAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    QuantityProcessed = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Waste = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Observations = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionActivities", x => x.Id);
                    table.CheckConstraint("CK_ProductionActivities_EndAfterStart", "\"EndAt\" IS NULL OR \"EndAt\" > \"StartAt\"");
                    table.CheckConstraint("CK_ProductionActivities_QtyNonNegative", "\"QuantityProcessed\" >= 0 AND \"Waste\" >= 0");
                    table.ForeignKey(
                        name: "FK_ProductionActivities_ProductionActivityCodes_ActivityCodeId",
                        column: x => x.ActivityCodeId,
                        principalSchema: "production",
                        principalTable: "ProductionActivityCodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductionActivities_ProductionActivitySubcodes_SubcodeId",
                        column: x => x.SubcodeId,
                        principalSchema: "production",
                        principalTable: "ProductionActivitySubcodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProductionActivities_ProductionOrders_ProductionOrderId",
                        column: x => x.ProductionOrderId,
                        principalSchema: "production",
                        principalTable: "ProductionOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProductionActivities_ProductionSessions_SessionId",
                        column: x => x.SessionId,
                        principalSchema: "production",
                        principalTable: "ProductionSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductionWasteEntries",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    WasteReasonId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReasonCodeSnapshot = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ReasonNameSnapshot = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Observations = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionWasteEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductionWasteEntries_ProductionActivities_ActivityId",
                        column: x => x.ActivityId,
                        principalSchema: "production",
                        principalTable: "ProductionActivities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductionWasteEntries_ProductionWasteReasons_WasteReasonId",
                        column: x => x.WasteReasonId,
                        principalSchema: "production",
                        principalTable: "ProductionWasteReasons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivities_ActivityCodeId",
                schema: "production",
                table: "ProductionActivities",
                column: "ActivityCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivities_IdempotencyKey",
                schema: "production",
                table: "ProductionActivities",
                column: "IdempotencyKey",
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivities_OperationalDate",
                schema: "production",
                table: "ProductionActivities",
                column: "OperationalDate");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivities_ProductionOrderId",
                schema: "production",
                table: "ProductionActivities",
                column: "ProductionOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivities_ProductionOrderNumber",
                schema: "production",
                table: "ProductionActivities",
                column: "ProductionOrderNumber");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivities_SessionId",
                schema: "production",
                table: "ProductionActivities",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivities_StartAt_EndAt",
                schema: "production",
                table: "ProductionActivities",
                columns: new[] { "StartAt", "EndAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivities_SubcodeId",
                schema: "production",
                table: "ProductionActivities",
                column: "SubcodeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivityCodes_Code",
                schema: "production",
                table: "ProductionActivityCodes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductionActivitySubcodes_ActivityCodeId_Code",
                schema: "production",
                table: "ProductionActivitySubcodes",
                columns: new[] { "ActivityCodeId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductionMachines_Code",
                schema: "production",
                table: "ProductionMachines",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductionMachines_Name",
                schema: "production",
                table: "ProductionMachines",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionOperators_Code",
                schema: "production",
                table: "ProductionOperators",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductionOperators_DisplayName",
                schema: "production",
                table: "ProductionOperators",
                column: "DisplayName");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionOperators_UserId",
                schema: "production",
                table: "ProductionOperators",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionSessions_IdempotencyKey",
                schema: "production",
                table: "ProductionSessions",
                column: "IdempotencyKey",
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionSessions_MachineId_OperationalDate_Status",
                schema: "production",
                table: "ProductionSessions",
                columns: new[] { "MachineId", "OperationalDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductionSessions_OperationalDate",
                schema: "production",
                table: "ProductionSessions",
                column: "OperationalDate");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionSessions_OperatorId_OperationalDate_Status",
                schema: "production",
                table: "ProductionSessions",
                columns: new[] { "OperatorId", "OperationalDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductionSessions_ShiftId",
                schema: "production",
                table: "ProductionSessions",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionShifts_Code",
                schema: "production",
                table: "ProductionShifts",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductionWasteEntries_ActivityId",
                schema: "production",
                table: "ProductionWasteEntries",
                column: "ActivityId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionWasteEntries_WasteReasonId",
                schema: "production",
                table: "ProductionWasteEntries",
                column: "WasteReasonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionWasteReasons_Code",
                schema: "production",
                table: "ProductionWasteReasons",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductionWasteEntries",
                schema: "production");

            migrationBuilder.DropTable(
                name: "ProductionActivities",
                schema: "production");

            migrationBuilder.DropTable(
                name: "ProductionWasteReasons",
                schema: "production");

            migrationBuilder.DropTable(
                name: "ProductionActivitySubcodes",
                schema: "production");

            migrationBuilder.DropTable(
                name: "ProductionSessions",
                schema: "production");

            migrationBuilder.DropTable(
                name: "ProductionActivityCodes",
                schema: "production");

            migrationBuilder.DropTable(
                name: "ProductionMachines",
                schema: "production");

            migrationBuilder.DropTable(
                name: "ProductionOperators",
                schema: "production");

            migrationBuilder.DropTable(
                name: "ProductionShifts",
                schema: "production");
        }
    }
}
