package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Device identity is bound by both broker ACL and the per-device API token. */
@Service
public class MqttIngestService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final DeviceIngestService ingest;
    private final String prefix;

    public MqttIngestService(JdbcTemplate jdbc, ObjectMapper json, DeviceIngestService ingest,
        @Value("${agrothulir.mqtt.topic-prefix}") String prefix) {
        this.jdbc = jdbc; this.json = json; this.ingest = ingest; this.prefix = prefix;
    }

    @Transactional
    public Map<String, Object> receive(String topic, byte[] payload, boolean retained) throws Exception {
        if (retained) throw bad("MQTT_RETAINED_REJECTED", "Publish live telemetry with Retain turned off.");
        if (payload.length == 0 || payload.length > 16384) throw bad("MQTT_PAYLOAD_SIZE", "Payload must be between 1 and 16384 bytes.");
        String root = prefix + "/devices/";
        if (!topic.startsWith(root)) throw bad("MQTT_TOPIC_INVALID", "Unknown device topic.");
        String[] path = topic.substring(root.length()).split("/", -1);
        if (path.length != 2 || !java.util.Set.of("telemetry", "feedback", "status").contains(path[1]))
            throw bad("MQTT_TOPIC_INVALID", "Choose a telemetry, feedback or status topic.");
        String deviceId = UUID.fromString(path[0]).toString();
        JsonNode body = json.readTree(payload);
        String messageId = UUID.fromString(required(body, "messageId")).toString();
        String token = required(body, "token");
        ingest.authenticate(deviceId, token);
        jdbc.queryForObject("SELECT id FROM devices WHERE id=? FOR UPDATE", String.class, deviceId);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM mqtt_ingest_messages WHERE device_id=? AND message_id=?", Long.class, deviceId, messageId) > 0)
            return Map.of("messageId", messageId, "duplicate", true);

        if (path[1].equals("status")) {
            if (!"OFFLINE".equals(required(body, "status"))) throw bad("MQTT_STATUS_INVALID", "Use live component feedback to report online status.");
            jdbc.update("UPDATE devices SET status='OFFLINE' WHERE id=?", deviceId);
            jdbc.update("UPDATE components SET feedback_quality='STALE' WHERE device_id=?", deviceId);
        } else {
            Instant measuredAt = Instant.parse(required(body, "measuredAt"));
            Instant now = Instant.now();
            if (measuredAt.isBefore(now.minusSeconds(90)) || measuredAt.isAfter(now.plusSeconds(30)))
                throw bad("MQTT_MESSAGE_EXPIRED", "Use a UTC measuredAt within 90 seconds of now (maximum 30 seconds ahead).");
            JsonNode samples = body.get("samples");
            if (samples == null) storeSample(deviceId, token, body, measuredAt, path[1]);
            else {
                if (!samples.isArray() || samples.isEmpty() || samples.size() > 32) throw bad("MQTT_SAMPLES_INVALID", "Send between 1 and 32 samples.");
                java.util.Set<String> ids = new java.util.HashSet<>();
                for (JsonNode sample : samples) {
                    if (!ids.add(required(sample, "componentId"))) throw bad("MQTT_DUPLICATE_COMPONENT", "Send each component once per message.");
                    storeSample(deviceId, token, sample, measuredAt, path[1]);
                }
            }
        }
        jdbc.update("INSERT INTO mqtt_ingest_messages(device_id,message_id) VALUES (?,?)", deviceId, messageId);
        return Map.of("messageId", messageId, "stored", true);
    }

    private void storeSample(String deviceId, String token, JsonNode sample, Instant measuredAt, String topic) {
        String componentId = UUID.fromString(required(sample, "componentId")).toString();
        String commandId = optional(sample, "commandId");
        if (commandId != null && topic.equals("telemetry")) throw bad("MQTT_ACK_TOPIC", "Command acknowledgements belong on the feedback topic.");
        if (commandId != null) UUID.fromString(commandId);
        var previous = jdbc.queryForList("SELECT measured_at FROM components WHERE id=? AND device_id=?", componentId, deviceId);
        if (previous.isEmpty()) throw bad("COMPONENT_NOT_FOUND", "Component does not belong to this device.");
        Object last = previous.get(0).get("measured_at");
        Instant seen = last instanceof Timestamp ts ? ts.toInstant() : last instanceof java.time.OffsetDateTime odt ? odt.toInstant() : null;
        if (seen != null && measuredAt.isBefore(seen)) throw bad("MQTT_OUT_OF_ORDER", "This sample is older than the last component reading.");
        ingest.feedbackAt(deviceId, token, componentId, required(sample, "reportedState"), required(sample, "quality"),
            optional(sample, "value"), optional(sample, "unit"), commandId, measuredAt);
    }

    private String required(JsonNode node, String key) {
        String value = optional(node, key);
        if (value == null || value.isBlank()) throw bad("MQTT_FIELD_REQUIRED", "Missing field: " + key);
        return value;
    }
    private String optional(JsonNode node, String key) {
        JsonNode value = node == null ? null : node.get(key);
        if (value == null || value.isNull()) return null;
        if (!value.isValueNode()) throw bad("MQTT_FIELD_INVALID", "Field must be a scalar: " + key);
        return value.asText();
    }
    private ApiException bad(String code, String message) { return new ApiException(HttpStatus.BAD_REQUEST, code, message); }
}
