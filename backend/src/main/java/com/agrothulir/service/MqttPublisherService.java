package com.agrothulir.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.LinkedHashMap;
import java.util.Map;

/** Serializes device commands; transport sends QoS 1, never retained or buffered offline. */
@Service
public class MqttPublisherService {
    private final MqttDeviceService mqtt;
    private final ObjectMapper json;

    public MqttPublisherService(MqttDeviceService mqtt, ObjectMapper json) {
        this.mqtt = mqtt; this.json = json;
    }

    public void publishCommand(Map<String, Object> row) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("protocolVersion", 1); payload.put("commandId", row.get("id").toString());
        payload.put("runId", row.get("run_id").toString()); payload.put("deviceId", row.get("device_id").toString());
        payload.put("componentId", row.get("component_id").toString()); payload.put("hardwareChannel", row.get("hardware_channel"));
        payload.put("kind", row.get("kind")); payload.put("action", row.get("action"));
        payload.put("expectedState", OperationalFlowService.expectedState(row.get("action").toString()));
        payload.put("issuedAt", instant(row.get("created_at"))); payload.put("expiresAt", instant(row.get("expires_at")));
        mqtt.publishCommand(row.get("device_id").toString(), json.writeValueAsBytes(payload));
    }

    private String instant(Object value) {
        return value instanceof Timestamp ts ? ts.toInstant().toString() : ((java.time.OffsetDateTime) value).toInstant().toString();
    }
}
