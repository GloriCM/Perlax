DO $fix$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT n.nspname AS schema_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND c.relname = 'DesignPlannerJobs'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS %I character varying(4000) NOT NULL DEFAULT %L',
            r.schema_name, 'DesignPlannerJobs', 'Accion', '');
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS %I text NOT NULL DEFAULT %L',
            r.schema_name, 'DesignPlannerJobs', 'ProcesoJson', '{}');
    END LOOP;
END
$fix$;

SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'DesignPlannerJobs'
  AND column_name IN ('Accion', 'ProcesoJson')
ORDER BY table_schema, column_name;
