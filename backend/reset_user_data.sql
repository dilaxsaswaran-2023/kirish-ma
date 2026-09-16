-- Run once against the backend's PostgreSQL database while the API is stopped.
-- Flyway's UUID schema migration history stays intact; startup reseeds Kirish records.
DO $$
DECLARE data_tables text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO data_tables
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename <> 'flyway_schema_history';

  IF data_tables IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || data_tables || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;
