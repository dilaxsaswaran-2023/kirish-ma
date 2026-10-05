-- Only labelled demo measurements are removed. Device/user records and real
-- ingest history are preserved; the startup seeder no longer fabricates readings.
DELETE FROM sensor_readings WHERE quality = 'SEEDED';
