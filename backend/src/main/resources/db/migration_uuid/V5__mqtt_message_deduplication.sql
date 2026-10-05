CREATE TABLE mqtt_ingest_messages (
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id, message_id)
);
CREATE INDEX idx_mqtt_ingest_received ON mqtt_ingest_messages(received_at);
CREATE INDEX idx_outbox_dispatch ON outbox_events(event_type, dispatched_at, created_at);
