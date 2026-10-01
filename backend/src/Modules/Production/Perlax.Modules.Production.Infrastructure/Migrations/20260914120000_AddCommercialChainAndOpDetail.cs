using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    public partial class AddCommercialChainAndOpDetail : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."ManufacturingOrders"
                    ADD COLUMN IF NOT EXISTS "ClosedAt" timestamp with time zone NULL;
                ALTER TABLE production."ManufacturingOrders"
                    ADD COLUMN IF NOT EXISTS "ClosedBy" character varying(255) NULL;
                ALTER TABLE production."ManufacturingOrders"
                    ADD COLUMN IF NOT EXISTS "ProductionDeliveryDate" timestamp with time zone NULL;

                CREATE TABLE IF NOT EXISTS production."Customers" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "Name" character varying(255) NOT NULL,
                    "Nit" character varying(50) NULL,
                    "ContactName" character varying(255) NULL,
                    "Phone" character varying(60) NULL,
                    "Email" character varying(255) NULL,
                    "Address" character varying(500) NULL,
                    "ReceiptPercentage" numeric(5,2) NOT NULL DEFAULT 10,
                    "IsActive" boolean NOT NULL DEFAULT TRUE,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    "UpdatedAt" timestamp with time zone NULL,
                    "UpdatedBy" character varying(255) NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Customers_Name" ON production."Customers" ("Name");

                CREATE TABLE IF NOT EXISTS production."Remisiones" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "RemisionNumber" character varying(30) NOT NULL,
                    "CustomerOrderId" uuid NOT NULL,
                    "CustomerOrderNumber" character varying(20) NOT NULL,
                    "ClientName" character varying(255) NOT NULL,
                    "RemisionDate" timestamp with time zone NOT NULL,
                    "Status" character varying(40) NOT NULL,
                    "Notes" text NULL,
                    "HasTransport" boolean NOT NULL DEFAULT FALSE,
                    "TransportCarrier" character varying(200) NULL,
                    "TransportPlate" character varying(40) NULL,
                    "TransportDriver" character varying(200) NULL,
                    "TransportCost" numeric(18,2) NOT NULL DEFAULT 0,
                    "TransportNotes" text NULL,
                    "InvoiceId" uuid NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    "UpdatedAt" timestamp with time zone NULL,
                    "UpdatedBy" character varying(255) NULL,
                    CONSTRAINT "FK_Remisiones_CustomerOrders" FOREIGN KEY ("CustomerOrderId")
                        REFERENCES production."CustomerOrders" ("Id") ON DELETE RESTRICT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Remisiones_RemisionNumber" ON production."Remisiones" ("RemisionNumber");
                CREATE INDEX IF NOT EXISTS "IX_Remisiones_CustomerOrderId" ON production."Remisiones" ("CustomerOrderId");
                CREATE INDEX IF NOT EXISTS "IX_Remisiones_ClientName" ON production."Remisiones" ("ClientName");

                CREATE TABLE IF NOT EXISTS production."RemisionItems" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "RemisionId" uuid NOT NULL,
                    "CustomerOrderItemId" uuid NOT NULL,
                    "ManufacturingOrderId" uuid NULL,
                    "OrderPartId" uuid NOT NULL,
                    "ProductionOrderId" uuid NOT NULL,
                    "ProductName" character varying(500) NOT NULL,
                    "ReferenceName" character varying(200) NOT NULL,
                    "Quantity" numeric(18,2) NOT NULL,
                    "UnitPrice" numeric(18,2) NOT NULL DEFAULT 0,
                    "DispatchNotes" text NULL,
                    "IsFinalDispatch" boolean NOT NULL DEFAULT FALSE,
                    "FinalDispatchCode" character varying(20) NULL,
                    CONSTRAINT "FK_RemisionItems_Remisiones" FOREIGN KEY ("RemisionId")
                        REFERENCES production."Remisiones" ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_RemisionItems_RemisionId" ON production."RemisionItems" ("RemisionId");
                CREATE INDEX IF NOT EXISTS "IX_RemisionItems_CustomerOrderItemId" ON production."RemisionItems" ("CustomerOrderItemId");
                CREATE INDEX IF NOT EXISTS "IX_RemisionItems_ManufacturingOrderId" ON production."RemisionItems" ("ManufacturingOrderId");

                CREATE TABLE IF NOT EXISTS production."SalesInvoices" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "InvoiceNumber" character varying(30) NOT NULL,
                    "LegacyInvoiceNumber" character varying(30) NULL,
                    "RemisionId" uuid NOT NULL,
                    "RemisionNumber" character varying(30) NOT NULL,
                    "ClientName" character varying(255) NOT NULL,
                    "InvoiceDate" timestamp with time zone NOT NULL,
                    "DueDate" timestamp with time zone NULL,
                    "Status" character varying(40) NOT NULL,
                    "Notes" text NULL,
                    "Subtotal" numeric(18,2) NOT NULL DEFAULT 0,
                    "TaxAmount" numeric(18,2) NOT NULL DEFAULT 0,
                    "TotalAmount" numeric(18,2) NOT NULL DEFAULT 0,
                    "TaxRate" numeric(5,2) NOT NULL DEFAULT 19,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    "UpdatedAt" timestamp with time zone NULL,
                    "UpdatedBy" character varying(255) NULL,
                    "VoidedAt" timestamp with time zone NULL,
                    "VoidedBy" character varying(255) NULL,
                    CONSTRAINT "FK_SalesInvoices_Remisiones" FOREIGN KEY ("RemisionId")
                        REFERENCES production."Remisiones" ("Id") ON DELETE RESTRICT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalesInvoices_InvoiceNumber" ON production."SalesInvoices" ("InvoiceNumber");
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalesInvoices_RemisionId" ON production."SalesInvoices" ("RemisionId");

                CREATE TABLE IF NOT EXISTS production."SalesInvoiceItems" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "SalesInvoiceId" uuid NOT NULL,
                    "RemisionItemId" uuid NOT NULL,
                    "ProductName" character varying(500) NOT NULL,
                    "ReferenceName" character varying(200) NOT NULL,
                    "Quantity" numeric(18,2) NOT NULL,
                    "UnitPrice" numeric(18,2) NOT NULL,
                    "LineTotal" numeric(18,2) NOT NULL,
                    CONSTRAINT "FK_SalesInvoiceItems_SalesInvoices" FOREIGN KEY ("SalesInvoiceId")
                        REFERENCES production."SalesInvoices" ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_SalesInvoiceItems_SalesInvoiceId" ON production."SalesInvoiceItems" ("SalesInvoiceId");

                CREATE TABLE IF NOT EXISTS production."FinishedGoodsEntries" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "ManufacturingOrderId" uuid NOT NULL,
                    "EntryDate" timestamp with time zone NOT NULL,
                    "Quantity" numeric(18,2) NOT NULL,
                    "Notes" text NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    CONSTRAINT "FK_FinishedGoodsEntries_ManufacturingOrders" FOREIGN KEY ("ManufacturingOrderId")
                        REFERENCES production."ManufacturingOrders" ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsEntries_ManufacturingOrderId"
                    ON production."FinishedGoodsEntries" ("ManufacturingOrderId");

                CREATE TABLE IF NOT EXISTS production."OpMaterialLines" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "ManufacturingOrderId" uuid NOT NULL,
                    "PartName" character varying(200) NOT NULL,
                    "Category" character varying(80) NOT NULL,
                    "ProductId" uuid NULL,
                    "ProductName" character varying(500) NOT NULL,
                    "Quantity" numeric(18,4) NOT NULL,
                    "Unit" character varying(40) NOT NULL,
                    "UnitCost" numeric(18,2) NOT NULL DEFAULT 0,
                    "Notes" text NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    CONSTRAINT "FK_OpMaterialLines_ManufacturingOrders" FOREIGN KEY ("ManufacturingOrderId")
                        REFERENCES production."ManufacturingOrders" ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_OpMaterialLines_ManufacturingOrderId" ON production."OpMaterialLines" ("ManufacturingOrderId");

                CREATE TABLE IF NOT EXISTS production."OpLaborProcesses" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "ManufacturingOrderId" uuid NOT NULL,
                    "PartName" character varying(200) NOT NULL,
                    "WorkStation" character varying(200) NOT NULL,
                    "Observations" text NULL,
                    "Quantity" numeric(18,4) NOT NULL DEFAULT 0,
                    "RollWidth" numeric(18,4) NULL,
                    "CutLength" numeric(18,4) NULL,
                    "SheetWidth" numeric(18,4) NULL,
                    "SheetLength" numeric(18,4) NULL,
                    "Cabida" numeric(18,4) NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    CONSTRAINT "FK_OpLaborProcesses_ManufacturingOrders" FOREIGN KEY ("ManufacturingOrderId")
                        REFERENCES production."ManufacturingOrders" ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_OpLaborProcesses_ManufacturingOrderId" ON production."OpLaborProcesses" ("ManufacturingOrderId");

                CREATE TABLE IF NOT EXISTS production."OpExternalWorkshops" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "ManufacturingOrderId" uuid NOT NULL,
                    "WorkshopName" character varying(200) NOT NULL,
                    "WorkType" character varying(200) NOT NULL DEFAULT '',
                    "DeliveryToWorkshopDate" timestamp with time zone NULL,
                    "QuantityDelivered" numeric(18,2) NOT NULL DEFAULT 0,
                    "Fajado" numeric(18,2) NOT NULL DEFAULT 0,
                    "Estresado" numeric(18,2) NOT NULL DEFAULT 0,
                    "Empacado" numeric(18,2) NOT NULL DEFAULT 0,
                    "UnitPrice" numeric(18,2) NOT NULL,
                    "Observations" text NULL,
                    "ReturnDate" timestamp with time zone NULL,
                    "ReturnQuantity" numeric(18,2) NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    CONSTRAINT "FK_OpExternalWorkshops_ManufacturingOrders" FOREIGN KEY ("ManufacturingOrderId")
                        REFERENCES production."ManufacturingOrders" ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_OpExternalWorkshops_ManufacturingOrderId" ON production."OpExternalWorkshops" ("ManufacturingOrderId");

                CREATE TABLE IF NOT EXISTS production."InventoryConsumptions" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "ApplicationNumber" character varying(30) NOT NULL,
                    "ManufacturingOrderId" uuid NOT NULL,
                    "OpNumber" character varying(20) NOT NULL,
                    "ProductId" uuid NULL,
                    "ProductName" character varying(500) NOT NULL,
                    "Quantity" numeric(18,4) NOT NULL,
                    "Unit" character varying(40) NOT NULL,
                    "UnitCost" numeric(18,2) NOT NULL DEFAULT 0,
                    "DeliveredTo" character varying(255) NOT NULL,
                    "ApplicationDate" timestamp with time zone NOT NULL,
                    "Notes" text NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL,
                    "UpdatedAt" timestamp with time zone NULL,
                    "UpdatedBy" character varying(255) NULL,
                    CONSTRAINT "FK_InventoryConsumptions_ManufacturingOrders" FOREIGN KEY ("ManufacturingOrderId")
                        REFERENCES production."ManufacturingOrders" ("Id") ON DELETE RESTRICT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_InventoryConsumptions_ApplicationNumber"
                    ON production."InventoryConsumptions" ("ApplicationNumber");
                CREATE INDEX IF NOT EXISTS "IX_InventoryConsumptions_ManufacturingOrderId"
                    ON production."InventoryConsumptions" ("ManufacturingOrderId");

                CREATE TABLE IF NOT EXISTS production."WarehouseStockMovements" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "ProductId" uuid NULL,
                    "ProductName" character varying(500) NOT NULL,
                    "MovementType" character varying(20) NOT NULL,
                    "Quantity" numeric(18,4) NOT NULL,
                    "UnitCost" numeric(18,2) NOT NULL DEFAULT 0,
                    "Reference" character varying(100) NULL,
                    "ManufacturingOrderId" uuid NULL,
                    "ConsumptionId" uuid NULL,
                    "MovementDate" timestamp with time zone NOT NULL,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "CreatedBy" character varying(255) NULL
                );
                CREATE INDEX IF NOT EXISTS "IX_WarehouseStockMovements_ProductName" ON production."WarehouseStockMovements" ("ProductName");
                CREATE INDEX IF NOT EXISTS "IX_WarehouseStockMovements_MovementDate" ON production."WarehouseStockMovements" ("MovementDate");
                CREATE INDEX IF NOT EXISTS "IX_WarehouseStockMovements_ConsumptionId" ON production."WarehouseStockMovements" ("ConsumptionId");
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS production."WarehouseStockMovements";
                DROP TABLE IF EXISTS production."InventoryConsumptions";
                DROP TABLE IF EXISTS production."OpExternalWorkshops";
                DROP TABLE IF EXISTS production."OpLaborProcesses";
                DROP TABLE IF EXISTS production."OpMaterialLines";
                DROP TABLE IF EXISTS production."FinishedGoodsEntries";
                DROP TABLE IF EXISTS production."SalesInvoiceItems";
                DROP TABLE IF EXISTS production."SalesInvoices";
                DROP TABLE IF EXISTS production."RemisionItems";
                DROP TABLE IF EXISTS production."Remisiones";
                DROP TABLE IF EXISTS production."Customers";
                ALTER TABLE production."ManufacturingOrders" DROP COLUMN IF EXISTS "ClosedAt";
                ALTER TABLE production."ManufacturingOrders" DROP COLUMN IF EXISTS "ClosedBy";
                ALTER TABLE production."ManufacturingOrders" DROP COLUMN IF EXISTS "ProductionDeliveryDate";
                """);
        }
    }
}
