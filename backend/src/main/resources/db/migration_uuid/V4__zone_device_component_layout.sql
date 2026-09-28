ALTER TABLE devices
  ADD CONSTRAINT fk_devices_zone FOREIGN KEY (zone_id) REFERENCES zones(id);

ALTER TABLE components
  ADD COLUMN display_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_zones_tenant_site ON zones(corporation_id, site_id);
CREATE INDEX idx_devices_tenant_zone ON devices(corporation_id, zone_id);
CREATE INDEX idx_components_device_order ON components(device_id, display_order);
