package com.agrothulir.service;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;

/** TLS uses the JVM trust store and verifies the broker hostname; never trust-all. */
@Component
public class MqttConnectionSettings {
    final boolean enabled;
    final String brokerUrl, clientId, prefix;
    private final String username, password;

    public MqttConnectionSettings(@Value("${agrothulir.mqtt.enabled}") boolean enabled,
        @Value("${agrothulir.mqtt.broker-url}") String brokerUrl,
        @Value("${agrothulir.mqtt.username}") String username,
        @Value("${agrothulir.mqtt.password}") String password,
        @Value("${agrothulir.mqtt.allow-anonymous:false}") boolean allowAnonymous,
        @Value("${agrothulir.mqtt.require-tls:true}") boolean requireTls,
        @Value("${agrothulir.mqtt.client-id}") String clientId,
        @Value("${agrothulir.mqtt.topic-prefix}") String prefix) {
        this.enabled = enabled; this.brokerUrl = brokerUrl; this.username = username;
        this.password = password; this.clientId = clientId; this.prefix = prefix;
        URI uri = URI.create(brokerUrl);
        if (uri.getHost() == null || !java.util.Set.of("ssl", "tcp").contains(uri.getScheme())
            || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
            || uri.getPath() != null && !uri.getPath().isEmpty()
            || uri.getPort() < 1 || uri.getPort() > 65535)
            throw new IllegalArgumentException("MQTT_BROKER_URL must be ssl://host:port (or explicit development tcp://host:port), without credentials or a path.");
        if (enabled && requireTls && !"ssl".equals(uri.getScheme()))
            throw new IllegalArgumentException("MQTT requires TLS. Use ssl:// with a trusted broker certificate.");
        if (enabled && (username.isBlank() != password.isBlank() || username.isBlank() && !allowAnonymous))
            throw new IllegalArgumentException("Provide both MQTT credentials, or explicitly enable MQTT_ALLOW_ANONYMOUS for a broker that permits it.");
        if (clientId.isBlank() || !prefix.matches("[a-zA-Z0-9_-]+"))
            throw new IllegalArgumentException("Use a non-empty MQTT client ID and a single safe MQTT topic prefix.");
    }

    public MqttConnectOptions connectionOptions() {
        MqttConnectOptions options = new MqttConnectOptions();
        if (!username.isBlank()) {
            options.setUserName(username); options.setPassword(password.toCharArray());
        }
        options.setHttpsHostnameVerificationEnabled(true);
        options.setMqttVersion(MqttConnectOptions.MQTT_VERSION_3_1_1);
        options.setCleanSession(true); options.setAutomaticReconnect(false);
        options.setConnectionTimeout(5); options.setKeepAliveInterval(20);
        return options;
    }
}
