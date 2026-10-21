package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/** Only listens to Kirish device data; commands/results are never ingested as telemetry. */
@Service
public class MqttSubscriberService {
    private static final Logger log = LoggerFactory.getLogger(MqttSubscriberService.class);
    private final MqttIngestService ingest;
    private final ObjectMapper json;
    private final MqttConnectionSettings settings;

    public MqttSubscriberService(MqttIngestService ingest, ObjectMapper json, MqttConnectionSettings settings) {
        this.ingest = ingest; this.json = json; this.settings = settings;
    }

    public String[] topics() {
        String root = settings.prefix + "/devices/+/";
        return new String[]{root + "telemetry", root + "feedback", root + "status"};
    }

    public Reply receive(String topic, MqttMessage message) {
        String[] path = topic.split("/", -1);
        if (path.length != 4 || !path[0].equals(settings.prefix) || !path[1].equals("devices")
            || !java.util.Set.of("telemetry", "feedback", "status").contains(path[3])) return null;
        try { UUID.fromString(path[2]); } catch (IllegalArgumentException invalid) { return null; }
        Map<String, Object> result;
        try { result = ingest.receive(topic, message.getPayload(), message.isRetained()); }
        catch (Exception failure) {
            String code = failure instanceof ApiException api ? api.code() : "MQTT_INVALID_MESSAGE";
            // Payloads contain device tokens: do not log them, or echo them in results.
            log.warn("MQTT message rejected: deviceId={}, code={}", path[2], code);
            result = Map.of("stored", false, "code", code);
        }
        try { return new Reply(settings.prefix + "/devices/" + path[2] + "/results", json.writeValueAsBytes(result)); }
        catch (Exception failure) { log.warn("MQTT result serialization failed."); return null; }
    }

    public record Reply(String topic, byte[] payload) {}
}
