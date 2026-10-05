package com.agrothulir.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class MqttOutboxDispatcher {
    private static final Logger log = LoggerFactory.getLogger(MqttOutboxDispatcher.class);
    private final JdbcTemplate jdbc;
    private final MqttDeviceService mqtt;
    private final ObjectMapper json;
    private final TransactionTemplate transactions;

    public MqttOutboxDispatcher(JdbcTemplate jdbc, MqttDeviceService mqtt, ObjectMapper json, PlatformTransactionManager manager) {
        this.jdbc = jdbc; this.mqtt = mqtt; this.json = json; this.transactions = new TransactionTemplate(manager);
    }

    @Scheduled(fixedDelay = 1000, initialDelay = 5000)
    public void dispatch() {
        if (!mqtt.isEnabled() || !mqtt.isConnected()) return;
        var ids = jdbc.queryForList("SELECT o.id FROM outbox_events o JOIN commands cmd ON cmd.id=o.aggregate_id " +
            "WHERE o.event_type='OPERATIONAL_FLOW_COMMAND' AND o.dispatched_at IS NULL " +
            "AND cmd.state IN ('ACCEPTED','EXECUTING') AND cmd.expires_at>CURRENT_TIMESTAMP " +
            "ORDER BY o.created_at FETCH FIRST 25 ROWS ONLY", String.class);
        for (String id : ids) transactions.executeWithoutResult(status -> send(id));
    }

    private void send(String id) {
        // Lock the outbox row to prevent a second API instance publishing it concurrently.
        var events = jdbc.queryForList("SELECT id FROM outbox_events WHERE id=? AND dispatched_at IS NULL FOR UPDATE", id);
        if (events.isEmpty()) return;
        var commands = jdbc.queryForList("SELECT cmd.id,cmd.run_id,cmd.device_id,cmd.component_id,cmd.action,cmd.expires_at,cmd.created_at," +
            "c.kind,c.hardware_channel FROM commands cmd JOIN components c ON c.id=cmd.component_id " +
            "JOIN devices d ON d.id=cmd.device_id JOIN outbox_events o ON o.aggregate_id=cmd.id " +
            "WHERE o.id=? AND cmd.state IN ('ACCEPTED','EXECUTING') AND cmd.expires_at>CURRENT_TIMESTAMP " +
            "AND d.status='ONLINE' AND d.last_seen_at>?", id, Timestamp.from(Instant.now().minusSeconds(120)));
        if (commands.isEmpty()) return;
        Map<String, Object> row = commands.get(0);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("protocolVersion", 1); payload.put("commandId", row.get("id").toString());
        payload.put("runId", row.get("run_id").toString()); payload.put("deviceId", row.get("device_id").toString());
        payload.put("componentId", row.get("component_id").toString()); payload.put("hardwareChannel", row.get("hardware_channel"));
        payload.put("kind", row.get("kind")); payload.put("action", row.get("action"));
        payload.put("expectedState", OperationalFlowService.expectedState(row.get("action").toString()));
        payload.put("issuedAt", instant(row.get("created_at"))); payload.put("expiresAt", instant(row.get("expires_at")));
        jdbc.update("UPDATE outbox_events SET attempts=attempts+1 WHERE id=?", id);
        try {
            mqtt.publishCommand(row.get("device_id").toString(), json.writeValueAsBytes(payload));
            jdbc.update("UPDATE outbox_events SET dispatched_at=CURRENT_TIMESTAMP WHERE id=?", id);
            log.info("MQTT command published: commandId={}, deviceId={}, action={}", row.get("id"), row.get("device_id"), row.get("action"));
        } catch (Exception failure) { log.warn("MQTT command not acknowledged by broker: commandId={}; retrying until expiry.", row.get("id")); }
    }

    private String instant(Object value) {
        return value instanceof Timestamp ts ? ts.toInstant().toString() : ((java.time.OffsetDateTime) value).toInstant().toString();
    }
}
