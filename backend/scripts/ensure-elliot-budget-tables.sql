-- Tablas modelo Elliot (idempotente). Schema: budgets
CREATE TABLE IF NOT EXISTS budgets."BudgetIncomeLines" (
    "Id" uuid NOT NULL,
    "BudgetId" uuid NOT NULL,
    "Code" character varying(40) NOT NULL,
    "Name" character varying(255) NOT NULL,
    "Amount" numeric(18,2) NOT NULL,
    "MaterialPct" numeric(9,6) NOT NULL,
    "SortOrder" integer NOT NULL,
    CONSTRAINT "PK_BudgetIncomeLines" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_BudgetIncomeLines_Budgets_BudgetId"
        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_BudgetIncomeLines_BudgetId" ON budgets."BudgetIncomeLines" ("BudgetId");

CREATE TABLE IF NOT EXISTS budgets."BudgetPayrollPeople" (
    "Id" uuid NOT NULL,
    "BudgetId" uuid NOT NULL,
    "Section" character varying(40) NOT NULL,
    "Name" character varying(255) NOT NULL,
    "Role" character varying(255) NOT NULL,
    "Salary" numeric(18,2) NOT NULL,
    "TransportSubsidy" numeric(18,2) NOT NULL,
    "CostCenterCode" character varying(40) NULL,
    "SortOrder" integer NOT NULL,
    CONSTRAINT "PK_BudgetPayrollPeople" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_BudgetPayrollPeople_Budgets_BudgetId"
        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_BudgetPayrollPeople_BudgetId_Section" ON budgets."BudgetPayrollPeople" ("BudgetId", "Section");

CREATE TABLE IF NOT EXISTS budgets."BudgetFixedItems" (
    "Id" uuid NOT NULL,
    "BudgetId" uuid NOT NULL,
    "Group" character varying(80) NOT NULL,
    "Concept" character varying(255) NOT NULL,
    "Amount" numeric(18,2) NOT NULL,
    "SortOrder" integer NOT NULL,
    CONSTRAINT "PK_BudgetFixedItems" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_BudgetFixedItems_Budgets_BudgetId"
        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_BudgetFixedItems_BudgetId_Group" ON budgets."BudgetFixedItems" ("BudgetId", "Group");

CREATE TABLE IF NOT EXISTS budgets."BudgetVariableCommissions" (
    "Id" uuid NOT NULL,
    "BudgetId" uuid NOT NULL,
    "Name" character varying(255) NOT NULL,
    "Group" character varying(80) NOT NULL,
    "Rate" numeric(9,6) NOT NULL,
    "BaseAmount" numeric(18,2) NOT NULL,
    "SortOrder" integer NOT NULL,
    CONSTRAINT "PK_BudgetVariableCommissions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_BudgetVariableCommissions_Budgets_BudgetId"
        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_BudgetVariableCommissions_BudgetId" ON budgets."BudgetVariableCommissions" ("BudgetId");

CREATE TABLE IF NOT EXISTS budgets."BudgetCostCenters" (
    "Id" uuid NOT NULL,
    "BudgetId" uuid NOT NULL,
    "Code" character varying(40) NOT NULL,
    "Name" character varying(255) NOT NULL,
    "ProductiveHours" numeric(18,2) NOT NULL,
    "SortOrder" integer NOT NULL,
    CONSTRAINT "PK_BudgetCostCenters" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_BudgetCostCenters_Budgets_BudgetId"
        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_BudgetCostCenters_BudgetId_Code" ON budgets."BudgetCostCenters" ("BudgetId", "Code");

CREATE TABLE IF NOT EXISTS budgets."BudgetMapSettings" (
    "Id" uuid NOT NULL,
    "BudgetId" uuid NOT NULL,
    "GeneralMfgFactor" numeric(9,6) NOT NULL,
    "AdminFactor" numeric(9,6) NOT NULL,
    "FinancialFactor" numeric(9,6) NOT NULL,
    "UtilizationPct" numeric(9,6) NOT NULL,
    CONSTRAINT "PK_BudgetMapSettings" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_BudgetMapSettings_Budgets_BudgetId"
        FOREIGN KEY ("BudgetId") REFERENCES budgets."Budgets" ("Id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_BudgetMapSettings_BudgetId" ON budgets."BudgetMapSettings" ("BudgetId");
