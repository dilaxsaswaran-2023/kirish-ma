package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MqttSubscriberServiceTest {
    private final MqttIngestService ingest = mock(MqttIngestService.class);
    private final MqttConnectionSettings settings = new MqttConnectionSettings(true,
        "ssl://mqtt.sathurix.com:8883", "", "", true, true, "kirish-test", "kirish");
    private final ObjectMapper json = new ObjectMapper();
    private final MqttSubscriberService subscriber = new MqttSubscriberService(ingest, json, settings);
    private final String root = "kirish/devices/" + UUID.randomUUID();

    @Test void subscribesToOnlyTelemetryFeedbackAndStatus() {
        assertThat(subscriber.topics()).containsExactly("kirish/devices/+/telemetry", "kirish/devices/+/feedback", "kirish/devices/+/status");
        assertThat(subscriber.receive(root + "/commands", new MqttMessage())).isNull();
        assertThat(subscriber.receive("another/devices/123/telemetry", new MqttMessage())).isNull();
        assertThat(subscriber.receive("kirish/devices/not-a-uuid/feedback", new MqttMessage())).isNull();
        verifyNoInteractions(ingest);
    }

    @Test void forwardsToTransactionalIngestAndRepliesOnSameDeviceResults() throws Exception {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        when(ingest.receive(root + "/telemetry", payload, false)).thenReturn(Map.of("stored", true));
        var result = subscriber.receive(root + "/telemetry", new MqttMessage(payload));
        assertThat(result.topic()).isEqualTo(root + "/results");
        assertThat(json.readTree(result.payload()).get("stored").asBoolean()).isTrue();
        verify(ingest).receive(root + "/telemetry", payload, false);
    }

    @Test void errorReplyDoesNotExposePayloadOrSecrets() throws Exception {
        byte[] payload = "secret-token-do-not-echo".getBytes(StandardCharsets.UTF_8);
        when(ingest.receive(root + "/feedback", payload, false))
            .thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "DEVICE_TOKEN_INVALID", "secret-token-do-not-echo"));
        var result = subscriber.receive(root + "/feedback", new MqttMessage(payload));
        assertThat(new String(result.payload(), StandardCharsets.UTF_8)).contains("DEVICE_TOKEN_INVALID").doesNotContain("secret-token");
    }
}
