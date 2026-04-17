CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;
DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'production') THEN
        CREATE SCHEMA production;
    END IF;
END $EF$;

CREATE TABLE production."ProductionOrders" (
    "Id" TEXT NOT NULL,
    "ProductCode" TEXT NOT NULL,
    "ProductName" TEXT NOT NULL,
    "PlannedQuantity" INTEGER NOT NULL,
    "ProducedQuantity" INTEGER NOT NULL,
    "ScheduledStart" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "PK_ProductionOrders" PRIMARY KEY ("Id")
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260226142717_InitialProductionMigration', '9.0.1');

ALTER TABLE production."ProductionOrders" DROP COLUMN "PlannedQuantity";

ALTER TABLE production."ProductionOrders" DROP COLUMN "ProducedQuantity";

ALTER TABLE production."ProductionOrders" DROP COLUMN "ScheduledStart";

ALTER TABLE production."ProductionOrders" ALTER COLUMN "Status" TYPE character varying(50);

ALTER TABLE production."ProductionOrders" ALTER COLUMN "ProductName" TYPE character varying(500);

ALTER TABLE production."ProductionOrders" ALTER COLUMN "ProductCode" TYPE text;

ALTER TABLE production."ProductionOrders" ALTER COLUMN "CreatedAt" TYPE timestamp with time zone;

ALTER TABLE production."ProductionOrders" ALTER COLUMN "Id" TYPE uuid;

ALTER TABLE production."ProductionOrders" ADD "Asignacion" text NOT NULL DEFAULT '';

ALTER TABLE production."ProductionOrders" ADD "Cliente" character varying(255) NOT NULL DEFAULT '';

ALTER TABLE production."ProductionOrders" ADD "CreatedBy" text;

ALTER TABLE production."ProductionOrders" ADD "EjecutivoCuenta" character varying(255) NOT NULL DEFAULT '';

ALTER TABLE production."ProductionOrders" ADD "FechaSolicitud" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';

ALTER TABLE production."ProductionOrders" ADD "LineaPT" text NOT NULL DEFAULT '';

ALTER TABLE production."ProductionOrders" ADD "NumeroPartes" integer NOT NULL DEFAULT 0;

ALTER TABLE production."ProductionOrders" ADD "OTNumber" character varying(20) NOT NULL DEFAULT '';

ALTER TABLE production."ProductionOrders" ADD "UpdatedAt" timestamp with time zone;

ALTER TABLE production."ProductionOrders" ADD "UpdatedBy" text;

CREATE TABLE production."OrderParts" (
    "Id" uuid NOT NULL,
    "ProductionOrderId" uuid NOT NULL,
    "PartName" character varying(200) NOT NULL,
    "SustratoSup" character varying(200),
    "SustratoMed" text,
    "SustratoInf" text,
    "DireccionFibra" text,
    "TipoFlauta" text,
    "DireccionFlauta" text,
    "Alto" numeric(18,2) NOT NULL,
    "Largo" numeric(18,2) NOT NULL,
    "Ancho" numeric(18,2) NOT NULL,
    "Fuelle" numeric(18,2) NOT NULL,
    "TroquelNuevo" boolean NOT NULL,
    "CodigoTroquel" text,
    "TintaC" boolean NOT NULL,
    "TintaM" boolean NOT NULL,
    "TintaY" boolean NOT NULL,
    "TintaK" boolean NOT NULL,
    "TintasEspeciales" text,
    "Terminado1" text,
    "Terminado2" text,
    "Estampado" boolean NOT NULL,
    "PieImprenta" text,
    "Notas" text,
    "AdjuntosJson" text,
    CONSTRAINT "PK_OrderParts" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_OrderParts_ProductionOrders_ProductionOrderId" FOREIGN KEY ("ProductionOrderId") REFERENCES production."ProductionOrders" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_OrderParts_ProductionOrderId" ON production."OrderParts" ("ProductionOrderId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260413130225_ExpandProductionOrder', '9.0.1');

COMMIT;

