using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Budgets.Infrastructure.Migrations;

[DbContext(typeof(Perlax.Modules.Budgets.Infrastructure.Persistence.BudgetsDbContext))]
[Migration("20260920120000_AddElliotBudgetModel")]
public partial class AddElliotBudgetModel : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "BudgetIncomeLines",
            schema: "budgets",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                BudgetId = table.Column<Guid>(type: "uuid", nullable: false),
                Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                MaterialPct = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BudgetIncomeLines", x => x.Id);
                table.ForeignKey(
                    name: "FK_BudgetIncomeLines_Budgets_BudgetId",
                    column: x => x.BudgetId,
                    principalSchema: "budgets",
                    principalTable: "Budgets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "BudgetPayrollPeople",
            schema: "budgets",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                BudgetId = table.Column<Guid>(type: "uuid", nullable: false),
                Section = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                Role = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                Salary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                TransportSubsidy = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                CostCenterCode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BudgetPayrollPeople", x => x.Id);
                table.ForeignKey(
                    name: "FK_BudgetPayrollPeople_Budgets_BudgetId",
                    column: x => x.BudgetId,
                    principalSchema: "budgets",
                    principalTable: "Budgets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "BudgetFixedItems",
            schema: "budgets",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                BudgetId = table.Column<Guid>(type: "uuid", nullable: false),
                Group = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                Concept = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BudgetFixedItems", x => x.Id);
                table.ForeignKey(
                    name: "FK_BudgetFixedItems_Budgets_BudgetId",
                    column: x => x.BudgetId,
                    principalSchema: "budgets",
                    principalTable: "Budgets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "BudgetVariableCommissions",
            schema: "budgets",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                BudgetId = table.Column<Guid>(type: "uuid", nullable: false),
                Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                Group = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                Rate = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: false),
                BaseAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BudgetVariableCommissions", x => x.Id);
                table.ForeignKey(
                    name: "FK_BudgetVariableCommissions_Budgets_BudgetId",
                    column: x => x.BudgetId,
                    principalSchema: "budgets",
                    principalTable: "Budgets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "BudgetCostCenters",
            schema: "budgets",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                BudgetId = table.Column<Guid>(type: "uuid", nullable: false),
                Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                ProductiveHours = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BudgetCostCenters", x => x.Id);
                table.ForeignKey(
                    name: "FK_BudgetCostCenters_Budgets_BudgetId",
                    column: x => x.BudgetId,
                    principalSchema: "budgets",
                    principalTable: "Budgets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "BudgetMapSettings",
            schema: "budgets",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                BudgetId = table.Column<Guid>(type: "uuid", nullable: false),
                GeneralMfgFactor = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: false),
                AdminFactor = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: false),
                FinancialFactor = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: false),
                UtilizationPct = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BudgetMapSettings", x => x.Id);
                table.ForeignKey(
                    name: "FK_BudgetMapSettings_Budgets_BudgetId",
                    column: x => x.BudgetId,
                    principalSchema: "budgets",
                    principalTable: "Budgets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(name: "IX_BudgetIncomeLines_BudgetId", schema: "budgets", table: "BudgetIncomeLines", column: "BudgetId");
        migrationBuilder.CreateIndex(name: "IX_BudgetPayrollPeople_BudgetId_Section", schema: "budgets", table: "BudgetPayrollPeople", columns: new[] { "BudgetId", "Section" });
        migrationBuilder.CreateIndex(name: "IX_BudgetFixedItems_BudgetId_Group", schema: "budgets", table: "BudgetFixedItems", columns: new[] { "BudgetId", "Group" });
        migrationBuilder.CreateIndex(name: "IX_BudgetVariableCommissions_BudgetId", schema: "budgets", table: "BudgetVariableCommissions", column: "BudgetId");
        migrationBuilder.CreateIndex(name: "IX_BudgetCostCenters_BudgetId_Code", schema: "budgets", table: "BudgetCostCenters", columns: new[] { "BudgetId", "Code" }, unique: true);
        migrationBuilder.CreateIndex(name: "IX_BudgetMapSettings_BudgetId", schema: "budgets", table: "BudgetMapSettings", column: "BudgetId", unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "BudgetIncomeLines", schema: "budgets");
        migrationBuilder.DropTable(name: "BudgetPayrollPeople", schema: "budgets");
        migrationBuilder.DropTable(name: "BudgetFixedItems", schema: "budgets");
        migrationBuilder.DropTable(name: "BudgetVariableCommissions", schema: "budgets");
        migrationBuilder.DropTable(name: "BudgetCostCenters", schema: "budgets");
        migrationBuilder.DropTable(name: "BudgetMapSettings", schema: "budgets");
    }
}
