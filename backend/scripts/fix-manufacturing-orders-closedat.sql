-- Fix: informes de gestión / cualquier query de ManufacturingOrders
-- Error: column m.ClosedAt does not exist
-- Ejecutar contra la BD de Production (schema production).

ALTER TABLE IF EXISTS production."ManufacturingOrders"
    ADD COLUMN IF NOT EXISTS "ClosedAt" timestamp with time zone NULL;

ALTER TABLE IF EXISTS production."ManufacturingOrders"
    ADD COLUMN IF NOT EXISTS "ClosedBy" character varying(255) NULL;

ALTER TABLE IF EXISTS production."ManufacturingOrders"
    ADD COLUMN IF NOT EXISTS "ProductionDeliveryDate" timestamp with time zone NULL;

-- Verificar:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'production' AND table_name = 'ManufacturingOrders'
--   AND column_name IN ('ClosedAt', 'ClosedBy', 'ProductionDeliveryDate');
