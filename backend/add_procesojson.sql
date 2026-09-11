ALTER TABLE IF EXISTS production."DesignPlannerJobs"
    ADD COLUMN IF NOT EXISTS "ProcesoJson" text NOT NULL DEFAULT (chr(123) || chr(125));

ALTER TABLE IF EXISTS public."DesignPlannerJobs"
    ADD COLUMN IF NOT EXISTS "ProcesoJson" text NOT NULL DEFAULT (chr(123) || chr(125));

SELECT table_schema, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'DesignPlannerJobs'
  AND column_name IN ('Accion', 'ProcesoJson')
ORDER BY table_schema, column_name;
