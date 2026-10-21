package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** No retained commands, no offline command buffering, and a committed DB outbox. */
@Service
public class MqttDeviceService {
    private static final Logger log = LoggerFactory.getLogger(MqttDeviceService.class);
    private final boolean enabled;
    private final String brokerUrl, clientId, prefix;
    private final ObjectProvider<MqttSubscriberService> subscriber;
    private final MqttConnectionSettings settings;
    private volatile MqttAsyncClient client;
    private volatile boolean subscribed;
    private volatile boolean subscribing;
    private volatile boolean connecting;
    private volatile boolean closing;

    public MqttDeviceService(MqttConnectionSettings settings, ObjectProvider<MqttSubscriberService> subscriber) {
        this.settings = settings; this.subscriber = subscriber;
        this.enabled = settings.enabled; this.brokerUrl = settings.brokerUrl;
        this.clientId = settings.clientId; this.prefix = settings.prefix;
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
            MqttConnectOptions options = settings.connectionOptions();
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
            client.subscribe(subscriber.getObject().topics(),
                new int[]{1, 1, 1}, null, new IMqttActionListener() {
                    @Override public void onSuccess(IMqttToken token) {
                        int[] granted = token.getGrantedQos();
                        subscribed = granted != null && granted.length == 3 && java.util.Arrays.stream(granted).allMatch(qos -> qos >= 0 && qos <= 2);
                        subscribing = false;
                        if (subscribed) log.info("MQTT connected and subscribed to device telemetry/feedback.");
                        else log.warn("MQTT broker denied one or more subscriptions; controls remain unavailable.");
                    }
                    @Override public void onFailure(IMqttToken token, Throwable cause) { subscribed = false; subscribing = false; log.warn("MQTT subscription failed."); }
                });
        } catch (MqttException failure) { subscribing = false; log.warn("MQTT subscription error code={}", failure.getReasonCode()); }
    }

    private void receive(String topic, MqttMessage message) {
        MqttSubscriberService.Reply reply = subscriber.getObject().receive(topic, message);
        if (reply == null) return;
        try {
            client.publish(reply.topic(), reply.payload(), 1, false);
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
