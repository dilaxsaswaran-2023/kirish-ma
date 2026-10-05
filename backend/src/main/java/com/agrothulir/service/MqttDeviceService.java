package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/** No retained commands, no offline command buffering, and a committed DB outbox. */
@Service
public class MqttDeviceService {
    private static final Logger log = LoggerFactory.getLogger(MqttDeviceService.class);
    private final boolean enabled;
    private final String brokerUrl, username, password, clientId, prefix;
    private final ObjectProvider<MqttIngestService> ingest;
    private final ObjectMapper json;
    private volatile MqttAsyncClient client;
    private volatile boolean subscribed;
    private volatile boolean subscribing;
    private volatile boolean connecting;
    private volatile boolean closing;

    public MqttDeviceService(@Value("${agrothulir.mqtt.enabled}") boolean enabled,
        @Value("${agrothulir.mqtt.broker-url}") String brokerUrl, @Value("${agrothulir.mqtt.username}") String username,
        @Value("${agrothulir.mqtt.password}") String password, @Value("${agrothulir.mqtt.client-id}") String clientId,
        @Value("${agrothulir.mqtt.topic-prefix}") String prefix, ObjectProvider<MqttIngestService> ingest, ObjectMapper json) {
        this.enabled = enabled; this.brokerUrl = brokerUrl; this.username = username; this.password = password;
        this.clientId = clientId; this.prefix = prefix; this.ingest = ingest; this.json = json;
        if (enabled && (username.isBlank() || password.isBlank())) throw new IllegalArgumentException("MQTT credentials are required when enabled.");
        if (!prefix.matches("[a-zA-Z0-9_-]+")) throw new IllegalArgumentException("Use a single safe MQTT topic prefix.");
    }

    public boolean isEnabled() { return enabled; }
    public boolean isConnected() { return client != null && client.isConnected() && subscribed; }
    public String connectionStatus() { return !enabled ? "DISABLED" : isConnected() ? "CONNECTED" : "DISCONNECTED"; }
    public void requireAvailable() {
        if (enabled && !isConnected()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MQTT_UNAVAILABLE", "Device connection is unavailable. No command was queued.");
    }

    @Scheduled(fixedDelay = 5000, initialDelay = 2000)
    public synchronized void connect() {
        if (!enabled || closing || connecting) return;
        try {
            if (client != null && client.isConnected()) { if (!subscribed && !subscribing) subscribe(); return; }
            subscribed = false;
            // Discard any in-memory expired QoS messages. Committed, unexpired DB commands
            // will be retried with the same commandId; controllers must deduplicate IDs.
            if (client != null) client.close(true);
            client = new MqttAsyncClient(brokerUrl, clientId, new MemoryPersistence());
            client.setCallback(new MqttCallback() {
                @Override public void connectionLost(Throwable cause) { subscribed = false; subscribing = false; log.warn("MQTT disconnected; starts are disabled."); }
                @Override public void deliveryComplete(IMqttDeliveryToken token) {}
                @Override public void messageArrived(String topic, MqttMessage message) { receive(topic, message); }
            });
            MqttConnectOptions options = new MqttConnectOptions();
            options.setUserName(username); options.setPassword(password.toCharArray());
            options.setCleanSession(true); options.setAutomaticReconnect(false); options.setConnectionTimeout(5); options.setKeepAliveInterval(20);
            connecting = true;
            client.connect(options, null, new IMqttActionListener() {
                @Override public void onSuccess(IMqttToken token) { connecting = false; subscribe(); }
                @Override public void onFailure(IMqttToken token, Throwable cause) { connecting = false; log.warn("MQTT connection failed; retrying in five seconds."); }
            });
        } catch (MqttException failure) { connecting = false; log.warn("MQTT connection error code={}", failure.getReasonCode()); }
    }

    private void subscribe() {
        try {
            subscribing = true;
            client.subscribe(new String[]{prefix + "/devices/+/telemetry", prefix + "/devices/+/feedback", prefix + "/devices/+/status"},
                new int[]{1, 1, 1}, null, new IMqttActionListener() {
                    @Override public void onSuccess(IMqttToken token) { subscribed = true; subscribing = false; log.info("MQTT connected and subscribed to device telemetry/feedback."); }
                    @Override public void onFailure(IMqttToken token, Throwable cause) { subscribed = false; subscribing = false; log.warn("MQTT subscription failed."); }
                });
        } catch (MqttException failure) { subscribing = false; log.warn("MQTT subscription error code={}", failure.getReasonCode()); }
    }

    private void receive(String topic, MqttMessage message) {
        Map<String, Object> result;
        try { result = ingest.getObject().receive(topic, message.getPayload(), message.isRetained()); }
        catch (Exception failure) {
            // Never log the raw payload: it contains a per-device token.
            String code = failure instanceof ApiException api ? api.code() : "MQTT_INVALID_MESSAGE";
            log.warn("MQTT message rejected: topic={}, code={}", topic, code);
            result = Map.of("stored", false, "code", code);
        }
        String[] parts = topic.split("/");
        if (parts.length != 4) return;
        try {
            UUID.fromString(parts[2]);
            client.publish(prefix + "/devices/" + parts[2] + "/results", json.writeValueAsBytes(result), 1, false);
        } catch (Exception failure) { log.warn("MQTT result delivery failed."); }
    }

    public void publishCommand(String deviceId, byte[] payload) throws MqttException {
        requireAvailable();
        client.publish(prefix + "/devices/" + deviceId + "/commands", payload, 1, false).waitForCompletion(2000);
    }

    @PreDestroy public synchronized void close() {
        closing = true; subscribed = false;
        if (client != null) try { client.disconnectForcibly(0, 1000, false); client.close(true); }
        catch (MqttException ignored) { log.warn("MQTT shutdown did not complete cleanly."); }
    }
}
