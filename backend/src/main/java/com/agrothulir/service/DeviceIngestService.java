package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.agrothulir.config.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Locale;
import java.util.UUID;

@Service
public class DeviceIngestService {
    private final JdbcTemplate jdbc;
    private final OperationalFlowService flows;
    private final SecureRandom random = new SecureRandom();

    public DeviceIngestService(JdbcTemplate jdbc, OperationalFlowService flows) {
        this.jdbc = jdbc; this.flows = flows;
    }

    @Transactional
    public Map<String, Object> rotateCredential(TenantContext context, String deviceId) {
        if (!context.canManage()) throw new ApiException(HttpStatus.FORBIDDEN, "MANAGE_FORBIDDEN", "Site management access is required.");
        List<Map<String, Object>> devices = jdbc.queryForList("SELECT site_id FROM devices WHERE id=? AND corporation_id=?", deviceId, context.corporationId());
        if (devices.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Device was not found in this corporation.");
        String siteId = devices.get(0).get("site_id").toString();
        if (context.role() == TenantContext.Role.SITE_MANAGER) {
            Long allowed = jdbc.queryForObject("SELECT COUNT(*) FROM site_grants WHERE corporation_id=? AND site_id=? AND user_id=? AND permission_profile='SITE_MANAGER'",
                Long.class, context.corporationId(), siteId, context.userId());
            if (allowed == null || allowed == 0) throw new ApiException(HttpStatus.FORBIDDEN, "SITE_ACCESS_DENIED", "This site is not assigned to your account.");
        }
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.update("DELETE FROM device_credentials WHERE device_id=?", deviceId);
        jdbc.update("INSERT INTO device_credentials(device_id,token_hash) VALUES (?,?)", deviceId, hash(token));
        jdbc.update("INSERT INTO audit_events(id,actor_id,corporation_id,site_id,operation,target,summary,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
            UUID.randomUUID().toString(), context.userId(), context.corporationId(), siteId, "DEVICE_CREDENTIAL_ROTATED", deviceId,
            "Device token rotated; the token is shown only once.", Timestamp.from(Instant.now()));
        return Map.of("deviceId", deviceId, "token", token);
    }

    public List<Map<String, Object>> pendingCommands(String deviceId, String token) {
        authenticate(deviceId, token);
        List<Map<String, Object>> raw = jdbc.queryForList("SELECT cmd.id,cmd.run_id,cmd.component_id,c.hardware_channel,c.kind,cmd.action,cmd.expires_at " +
            "FROM commands cmd JOIN components c ON c.id=cmd.component_id " +
            "JOIN flow_run_steps frs ON frs.command_id=cmd.id " +
            "WHERE cmd.device_id=? AND cmd.state IN ('ACCEPTED','EXECUTING') AND cmd.expires_at>CURRENT_TIMESTAMP " +
            "ORDER BY cmd.created_at FETCH FIRST 25 ROWS ONLY", deviceId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : raw) result.add(Map.of(
            "commandId", row.get("id").toString(), "runId", row.get("run_id").toString(),
            "componentId", row.get("component_id").toString(), "hardwareChannel", row.get("hardware_channel"),
            "kind", row.get("kind"), "action", row.get("action"), "expiresAt", row.get("expires_at").toString()));
        return result;
    }

    @Transactional
    public Map<String, Object> feedback(String deviceId, String token, String componentId, String reportedState,
        String quality, String value, String unit, String commandId) {
        return feedbackAt(deviceId, token, componentId, reportedState, quality, value, unit, commandId, Instant.now());
    }

    @Transactional
    public Map<String, Object> feedbackAt(String deviceId, String token, String componentId, String reportedState,
        String quality, String value, String unit, String commandId, Instant measuredAt) {
        authenticate(deviceId, token);
        // Serialize acknowledgements from this device, including concurrent HTTP/MQTT retries.
        jdbc.queryForObject("SELECT id FROM devices WHERE id=? FOR UPDATE", String.class, deviceId);
        List<Map<String, Object>> components = jdbc.queryForList("SELECT corporation_id,site_id,kind FROM components WHERE id=? AND device_id=?",
            componentId, deviceId);
        if (components.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "COMPONENT_NOT_FOUND", "Component was not found on this device.");
        Map<String, Object> component = components.get(0);
        if (!List.of("CONFIRMED", "UNKNOWN", "STALE", "INVALID").contains(quality))
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_QUALITY", "Choose a valid feedback quality.");
        if (reportedState == null || reportedState.isBlank())
            throw new ApiException(HttpStatus.BAD_REQUEST, "STATE_REQUIRED", "Report the component state.");
        reportedState = reportedState.toUpperCase(Locale.ROOT);
        Set<String> allowed = switch (component.get("kind").toString()) {
            case "VALVE" -> Set.of("OPEN", "CLOSED", "UNKNOWN", "FAULT");
            case "MOTOR", "PUMP" -> Set.of("RUNNING", "STOPPED", "UNKNOWN", "FAULT");
            case "SWITCH", "RELAY" -> Set.of("ON", "OFF", "UNKNOWN", "FAULT");
            case "SENSOR" -> Set.of("VALID", "INVALID", "UNKNOWN", "FAULT");
            default -> Set.of("UNKNOWN", "FAULT");
        };
        if (!allowed.contains(reportedState) || value != null && value.length() > 160 || unit != null && unit.length() > 40)
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FEEDBACK", "Choose a valid component state and bounded reading value.");
        if (commandId != null && !commandId.isBlank()) {
            Long complete = jdbc.queryForObject("SELECT COUNT(*) FROM commands WHERE id=? AND device_id=? AND component_id=? AND state='CONFIRMED'",
                Long.class, commandId, deviceId, componentId);
            if (complete != null && complete > 0) return Map.of("componentId", componentId, "stored", false, "flowAdvanced", false);
        }
        Instant now = Instant.now();
        jdbc.update("UPDATE devices SET status='ONLINE',last_seen_at=? WHERE id=?", Timestamp.from(now), deviceId);
        jdbc.update("UPDATE components SET reported_state=?,feedback_quality=?,latest_value=?,state_version=state_version+1,measured_at=? WHERE id=?",
            reportedState, quality, value, Timestamp.from(measuredAt), componentId);
        if ("SENSOR".equals(component.get("kind")) && value != null && !value.isBlank()) {
            jdbc.update("INSERT INTO sensor_readings(id,corporation_id,site_id,device_id,component_id,reading_value,unit,quality,measured_at) " +
                "VALUES (?,?,?,?,?,?,?,?,?)", UUID.randomUUID().toString(), component.get("corporation_id"), component.get("site_id"),
                deviceId, componentId, value, unit, quality, Timestamp.from(measuredAt));
        }
        boolean advanced = false;
        if (commandId != null && !commandId.isBlank()) {
            List<Map<String, Object>> pending = jdbc.queryForList("SELECT frs.id,frs.run_id,frs.expected_state FROM flow_run_steps frs " +
                "JOIN commands cmd ON cmd.id=frs.command_id WHERE cmd.id=? AND cmd.device_id=? AND cmd.component_id=? " +
                "AND cmd.state IN ('ACCEPTED','EXECUTING') AND cmd.expires_at>CURRENT_TIMESTAMP " +
                "AND frs.state='WAITING_FEEDBACK'", commandId, deviceId, componentId);
            if (pending.isEmpty()) throw new ApiException(HttpStatus.CONFLICT, "COMMAND_NOT_PENDING", "This command is not waiting for feedback.");
            Map<String, Object> step = pending.get(0);
            if ("CONFIRMED".equals(quality) && step.get("expected_state").equals(reportedState.toUpperCase())) {
                jdbc.update("UPDATE flow_run_steps SET state='CONFIRMED',confirmed_at=? WHERE id=?", Timestamp.from(now), step.get("id"));
                jdbc.update("UPDATE commands SET state='CONFIRMED',updated_at=? WHERE id=?", Timestamp.from(now), commandId);
                jdbc.update("UPDATE outbox_events SET dispatched_at=? WHERE aggregate_id=? AND dispatched_at IS NULL", Timestamp.from(now), commandId);
                flows.queueNextStep(step.get("run_id").toString());
                advanced = true;
            }
        }
        return Map.of("componentId", componentId, "stored", true, "flowAdvanced", advanced);
    }

    void authenticate(String deviceId, String token) {
        if (token == null || token.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "DEVICE_TOKEN_REQUIRED", "Device token is required.");
        List<String> stored = jdbc.queryForList("SELECT token_hash FROM device_credentials WHERE device_id=?", String.class, deviceId);
        if (stored.size() != 1 || !MessageDigest.isEqual(stored.get(0).getBytes(StandardCharsets.US_ASCII),
            hash(token).getBytes(StandardCharsets.US_ASCII)))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "DEVICE_TOKEN_INVALID", "Device token is invalid.");
    }

    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception exception) { throw new IllegalStateException(exception); }
    }
}
