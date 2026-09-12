CREATE TABLE corporations (
  id VARCHAR(64) PRIMARY KEY, workspace_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL, status VARCHAR(30) NOT NULL,
  default_timezone VARCHAR(80) NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY, identity_subject VARCHAR(180) NOT NULL UNIQUE,
  display_name VARCHAR(180) NOT NULL, account_status VARCHAR(30) NOT NULL
);
CREATE TABLE corporation_memberships (
  corporation_id VARCHAR(64) NOT NULL REFERENCES corporations(id), user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  corporate_role VARCHAR(40) NOT NULL, status VARCHAR(30) NOT NULL, PRIMARY KEY(corporation_id, user_id)
);
CREATE TABLE sites (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL REFERENCES corporations(id),
  name VARCHAR(180) NOT NULL, type VARCHAR(40) NOT NULL, location VARCHAR(180), timezone VARCHAR(80) NOT NULL,
  health VARCHAR(30) NOT NULL, moisture DECIMAL(10,2), pressure DECIMAL(10,2), archived_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(corporation_id, id)
);
CREATE TABLE zones (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL, site_id VARCHAR(64) NOT NULL,
  name VARCHAR(180) NOT NULL, FOREIGN KEY(corporation_id, site_id) REFERENCES sites(corporation_id, id)
);
CREATE TABLE site_grants (
  corporation_id VARCHAR(64) NOT NULL, site_id VARCHAR(64) NOT NULL, user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  permission_profile VARCHAR(40) NOT NULL, PRIMARY KEY(site_id, user_id),
  FOREIGN KEY(corporation_id, site_id) REFERENCES sites(corporation_id, id)
);
CREATE TABLE devices (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL, site_id VARCHAR(64) NOT NULL,
  zone_id VARCHAR(64), serial VARCHAR(100) NOT NULL UNIQUE, name VARCHAR(180) NOT NULL, model VARCHAR(100) NOT NULL,
  firmware VARCHAR(60), status VARCHAR(30) NOT NULL, last_seen_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(corporation_id, id), FOREIGN KEY(corporation_id, site_id) REFERENCES sites(corporation_id, id)
);
CREATE TABLE components (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL, site_id VARCHAR(64) NOT NULL,
  device_id VARCHAR(64) NOT NULL, kind VARCHAR(40) NOT NULL, name VARCHAR(180) NOT NULL,
  hardware_channel VARCHAR(80) NOT NULL, reported_state VARCHAR(60), feedback_quality VARCHAR(30) NOT NULL,
  latest_value VARCHAR(80), state_version BIGINT NOT NULL DEFAULT 1, measured_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(corporation_id, id), FOREIGN KEY(corporation_id, device_id) REFERENCES devices(corporation_id, id)
);
CREATE TABLE flows (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL, site_id VARCHAR(64) NOT NULL,
  name VARCHAR(180) NOT NULL, status VARCHAR(30) NOT NULL, published_version INT,
  graph TEXT, shutdown_policy TEXT, config_hash VARCHAR(160),
  FOREIGN KEY(corporation_id, site_id) REFERENCES sites(corporation_id, id)
);
CREATE TABLE schedules (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL, site_id VARCHAR(64) NOT NULL,
  target_flow_id VARCHAR(64) NOT NULL REFERENCES flows(id), flow_version INT NOT NULL,
  name VARCHAR(180) NOT NULL, timezone VARCHAR(80) NOT NULL, recurrence VARCHAR(200) NOT NULL,
  next_due_at TIMESTAMP WITH TIME ZONE, missed_policy VARCHAR(30) NOT NULL, enabled BOOLEAN NOT NULL,
  FOREIGN KEY(corporation_id, site_id) REFERENCES sites(corporation_id, id)
);
CREATE TABLE schedule_occurrences (
  schedule_id VARCHAR(64) NOT NULL REFERENCES schedules(id), due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  state VARCHAR(30) NOT NULL, run_id VARCHAR(64), PRIMARY KEY(schedule_id, due_at)
);
CREATE TABLE runs (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL, site_id VARCHAR(64) NOT NULL,
  initiator_id VARCHAR(64) NOT NULL, source VARCHAR(30) NOT NULL, state VARCHAR(30) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE, ended_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE commands (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL, run_id VARCHAR(64) NOT NULL REFERENCES runs(id),
  device_id VARCHAR(64) NOT NULL, component_id VARCHAR(64) NOT NULL, action VARCHAR(40) NOT NULL,
  state VARCHAR(30) NOT NULL, idempotency_key VARCHAR(180) NOT NULL, expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL, updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(corporation_id, idempotency_key)
);
CREATE TABLE resource_reservations (
  resource_id VARCHAR(64) PRIMARY KEY, owner_run VARCHAR(64) NOT NULL REFERENCES runs(id),
  fencing_generation BIGINT NOT NULL, expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE outbox_events (
  id VARCHAR(64) PRIMARY KEY, aggregate_id VARCHAR(64) NOT NULL, event_type VARCHAR(80) NOT NULL,
  payload TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  dispatched_at TIMESTAMP WITH TIME ZONE, attempts INT NOT NULL DEFAULT 0
);
CREATE TABLE alerts (
  id VARCHAR(64) PRIMARY KEY, corporation_id VARCHAR(64) NOT NULL, site_id VARCHAR(64) NOT NULL,
  severity VARCHAR(30) NOT NULL, title VARCHAR(180) NOT NULL, detail VARCHAR(500) NOT NULL,
  dedup_key VARCHAR(180) NOT NULL, raised_at TIMESTAMP WITH TIME ZONE NOT NULL,
  acknowledged_by VARCHAR(64), acknowledged_at TIMESTAMP WITH TIME ZONE, resolved_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE audit_events (
  id VARCHAR(64) PRIMARY KEY, actor_id VARCHAR(64) NOT NULL, corporation_id VARCHAR(64), site_id VARCHAR(64),
  operation VARCHAR(100) NOT NULL, target VARCHAR(180) NOT NULL, summary VARCHAR(1000), occurred_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_sites_corporation ON sites(corporation_id);
CREATE INDEX idx_devices_tenant_site ON devices(corporation_id, site_id);
CREATE INDEX idx_components_tenant_device ON components(corporation_id, device_id);
CREATE INDEX idx_commands_state ON commands(state, created_at);
CREATE INDEX idx_alerts_tenant_time ON alerts(corporation_id, raised_at);
