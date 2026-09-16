CREATE TABLE flow_steps (
  id UUID PRIMARY KEY,
  corporation_id UUID NOT NULL REFERENCES corporations(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id),
  step_index INT NOT NULL,
  on_action VARCHAR(30) NOT NULL,
  off_action VARCHAR(30) NOT NULL,
  UNIQUE(flow_id, step_index),
  UNIQUE(flow_id, component_id)
);

ALTER TABLE runs ADD COLUMN flow_id UUID REFERENCES flows(id);
ALTER TABLE runs ADD COLUMN requested_action VARCHAR(8);
ALTER TABLE runs ADD COLUMN idempotency_key VARCHAR(180);
CREATE UNIQUE INDEX idx_flow_run_idempotency ON runs(corporation_id, idempotency_key);

CREATE TABLE flow_run_steps (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES runs(id),
  command_id UUID REFERENCES commands(id),
  component_id UUID NOT NULL REFERENCES components(id),
  step_index INT NOT NULL,
  action VARCHAR(30) NOT NULL,
  expected_state VARCHAR(30) NOT NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'WAITING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(run_id, step_index)
);

CREATE TABLE sensor_readings (
  id UUID PRIMARY KEY,
  corporation_id UUID NOT NULL REFERENCES corporations(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  device_id UUID NOT NULL REFERENCES devices(id),
  component_id UUID NOT NULL REFERENCES components(id),
  reading_value VARCHAR(160) NOT NULL,
  unit VARCHAR(40),
  quality VARCHAR(30) NOT NULL,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sensor_site_time ON sensor_readings(site_id, measured_at DESC);

CREATE TABLE device_credentials (
  device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flow_site_status ON flows(site_id, status);
CREATE INDEX idx_flow_run_site_time ON runs(site_id, started_at DESC);
CREATE INDEX idx_flow_step_component ON flow_run_steps(component_id, state);
CREATE UNIQUE INDEX idx_component_channel ON components(device_id, hardware_channel);
