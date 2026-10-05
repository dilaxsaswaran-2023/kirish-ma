package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.agrothulir.config.TenantContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {"spring.config.import=", "logging.level.root=ERROR", "agrothulir.mqtt.enabled=false",
    "spring.datasource.url=jdbc:h2:mem:kirish-mqtt-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
    "spring.datasource.username=sa", "spring.datasource.password="})
@Transactional
class MqttIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired DeviceIngestService credentials;
    @Autowired MqttIngestService ingest;
    @Autowired OperationalFlowService flows;
    @Autowired PlatformTransactionManager manager;
    String deviceId, motorId, sensorId, siteId, token;
    TenantContext admin;

    @BeforeEach void setup() {
        String corporation = jdbc.queryForObject("SELECT id FROM corporations WHERE workspace_code='KIRISH'", String.class);
        String user = jdbc.queryForObject("SELECT id FROM users WHERE email='kirish@gmail.com'", String.class);
        admin = new TenantContext(user, corporation, TenantContext.Role.CORPORATE_ADMIN);
        deviceId = jdbc.queryForObject("SELECT id FROM devices WHERE serial='KIR-AT8X-001'", String.class);
        siteId = jdbc.queryForObject("SELECT site_id FROM devices WHERE id=?", String.class, deviceId);
        motorId = jdbc.queryForObject("SELECT id FROM components WHERE device_id=? AND kind='PUMP'", String.class, deviceId);
        sensorId = jdbc.queryForList("SELECT id FROM components WHERE device_id=? AND kind='SENSOR' ORDER BY name", String.class, deviceId).getFirst();
        token = credentials.rotateCredential(admin, deviceId).get("token").toString();
    }
    private Map<String, Object> message(String component, String state) {
        return new HashMap<>(Map.of("messageId", UUID.randomUUID().toString(), "token", token, "measuredAt", Instant.now().toString(),
            "componentId", component, "reportedState", state, "quality", "CONFIRMED"));
    }
    private Map<String, Object> receive(String suffix, Map<String, Object> message) throws Exception {
        return ingest.receive("kirish/devices/" + deviceId + "/" + suffix, json.writeValueAsBytes(message), false);
    }
    private String flow() throws Exception {
        receive("telemetry", message(motorId, "STOPPED"));
        return flows.createFlow(admin, siteId, "MQTT test flow", List.of(motorId)).get("id").toString();
    }
    private MqttDeviceService publisher() {
        MqttDeviceService mqtt = mock(MqttDeviceService.class);
        when(mqtt.isEnabled()).thenReturn(true); when(mqtt.isConnected()).thenReturn(true);
        return mqtt;
    }

    @Test void sensorDataIsPersistedOnceAndDeviceBecomesOnline() throws Exception {
        var body = message(sensorId, "VALID"); body.put("value", "28.6"); body.put("unit", "C");
        receive("telemetry", body);
        assertThat(receive("telemetry", body)).containsEntry("duplicate", true);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sensor_readings WHERE component_id=?", Long.class, sensorId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT latest_value FROM components WHERE id=?", String.class, sensorId)).isEqualTo("28.6");
        assertThat(jdbc.queryForObject("SELECT status FROM devices WHERE id=?", String.class, deviceId)).isEqualTo("ONLINE");
    }

    @Test void rejectsWrongCredentialsRetainedExpiredAndWrongDeviceData() throws Exception {
        var wrong = message(motorId, "STOPPED"); wrong.put("token", "wrong-token");
        assertThatThrownBy(() -> receive("telemetry", wrong)).isInstanceOf(ApiException.class);
        var valid = message(motorId, "STOPPED");
        assertThatThrownBy(() -> ingest.receive("kirish/devices/" + deviceId + "/telemetry", json.writeValueAsBytes(valid), true)).hasMessageContaining("Retain");
        var old = message(motorId, "STOPPED"); old.put("measuredAt", Instant.now().minusSeconds(91).toString());
        assertThatThrownBy(() -> receive("telemetry", old)).hasMessageContaining("90 seconds");
        var crossDevice = message(jdbc.queryForList("SELECT id FROM components WHERE device_id<>?", String.class, deviceId).getFirst(), "STOPPED");
        assertThatThrownBy(() -> receive("telemetry", crossDevice)).hasMessageContaining("does not belong");
        assertThat(jdbc.queryForObject("SELECT status FROM devices WHERE id=?", String.class, deviceId)).isEqualTo("OFFLINE");
    }

    @Test void commandIsPublishedFromOutboxAndOnlyFeedbackConfirmsIt() throws Exception {
        String flowId = flow();
        var run = flows.action(admin, flowId, "ON", UUID.randomUUID().toString());
        assertThat(run.get("state")).isEqualTo("WAITING_FEEDBACK");
        MqttDeviceService mqtt = publisher();
        var dispatcher = new MqttOutboxDispatcher(jdbc, mqtt, json, manager);
        var payload = org.mockito.ArgumentCaptor.forClass(byte[].class);
        dispatcher.dispatch(); dispatcher.dispatch();
        verify(mqtt, times(1)).publishCommand(eq(deviceId), payload.capture());
        JsonNode command = json.readTree(payload.getValue());
        assertThat(command.get("action").asText()).isEqualTo("START");
        assertThat(command.get("expectedState").asText()).isEqualTo("RUNNING");
        assertThat(Instant.parse(command.get("expiresAt").asText())).isAfter(Instant.now());
        assertThat(flows.run(admin, run.get("id").toString()).get("state")).isEqualTo("WAITING_FEEDBACK");
        var ack = message(motorId, "RUNNING"); ack.put("commandId", command.get("commandId").asText());
        receive("feedback", ack);
        assertThat(flows.run(admin, run.get("id").toString()).get("state")).isEqualTo("CONFIRMED");
        assertThat(flows.flow(admin, flowId).get("currentState")).isEqualTo("ON");
        receive("feedback", ack);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM commands", Long.class)).isEqualTo(1);
    }

    @Test void publisherRetriesSameCommandIdAfterBrokerFailure() throws Exception {
        String flowId = flow(); flows.action(admin, flowId, "ON", UUID.randomUUID().toString());
        MqttDeviceService mqtt = publisher();
        doThrow(new MqttException(MqttException.REASON_CODE_CONNECTION_LOST)).doNothing().when(mqtt).publishCommand(anyString(), any());
        var dispatcher = new MqttOutboxDispatcher(jdbc, mqtt, json, manager);
        dispatcher.dispatch();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM outbox_events WHERE dispatched_at IS NULL", Long.class)).isEqualTo(1);
        dispatcher.dispatch();
        var payload = org.mockito.ArgumentCaptor.forClass(byte[].class);
        verify(mqtt, times(2)).publishCommand(eq(deviceId), payload.capture());
        assertThat(json.readTree(payload.getAllValues().get(0)).get("commandId")).isEqualTo(json.readTree(payload.getAllValues().get(1)).get("commandId"));
    }

    @Test void expiredCommandsAndOfflineDevicesAreNotPublished() throws Exception {
        String flowId = flow(); flows.action(admin, flowId, "ON", UUID.randomUUID().toString());
        MqttDeviceService mqtt = publisher();
        var dispatcher = new MqttOutboxDispatcher(jdbc, mqtt, json, manager);
        jdbc.update("UPDATE devices SET status='OFFLINE' WHERE id=?", deviceId);
        dispatcher.dispatch(); verify(mqtt, never()).publishCommand(anyString(), any());
        jdbc.update("UPDATE devices SET status='ONLINE' WHERE id=?", deviceId);
        jdbc.update("UPDATE commands SET expires_at=?", java.sql.Timestamp.from(Instant.now().minusSeconds(1)));
        dispatcher.dispatch(); verify(mqtt, never()).publishCommand(anyString(), any());
    }

    @Test void offlineStatusInvalidatesFeedbackAndConflictingFlowsCannotShareMotor() throws Exception {
        String first = flow();
        String second = flows.createFlow(admin, siteId, "Conflicting test flow", List.of(motorId)).get("id").toString();
        flows.action(admin, first, "ON", UUID.randomUUID().toString());
        assertThatThrownBy(() -> flows.action(admin, second, "ON", UUID.randomUUID().toString())).hasMessageContaining("another active operation");
        receive("status", Map.of("messageId", UUID.randomUUID().toString(), "token", token, "status", "OFFLINE"));
        assertThat(jdbc.queryForObject("SELECT feedback_quality FROM components WHERE id=?", String.class, motorId)).isEqualTo("STALE");
    }
}
