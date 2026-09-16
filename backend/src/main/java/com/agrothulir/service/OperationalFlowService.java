package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.agrothulir.config.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class OperationalFlowService {
    private final JdbcTemplate jdbc;
    private final MqttDeviceService mqtt;

    public OperationalFlowService(JdbcTemplate jdbc, MqttDeviceService mqtt) { this.jdbc = jdbc; this.mqtt = mqtt; }

    public List<Map<String, Object>> flows(TenantContext context, String siteId) {
        requireSite(context, siteId, false);
        return rows("SELECT f.id,f.site_id,f.name,f.status,f.published_version,COUNT(fs.id) AS step_count " +
            "FROM flows f JOIN flow_steps fs ON fs.flow_id=f.id WHERE f.corporation_id=? AND f.site_id=? " +
            "AND f.status<>'ARCHIVED' GROUP BY f.id,f.site_id,f.name,f.status,f.published_version ORDER BY f.name",
            context.corporationId(), siteId);
    }

    public Map<String, Object> flow(TenantContext context, String flowId) {
        Map<String, Object> flow = one("SELECT id,corporation_id,site_id,name,status,published_version FROM flows WHERE id=? AND corporation_id=?",
            flowId, context.corporationId());
        String siteId = flow.get("site_id").toString();
        requireSite(context, siteId, false);
        List<Map<String, Object>> steps = rows("SELECT fs.id,fs.step_index,fs.component_id,fs.on_action,fs.off_action," +
            "c.name AS component_name,c.kind,c.reported_state,c.feedback_quality,c.hardware_channel," +
            "d.id AS device_id,d.name AS device_name,d.status AS device_status " +
            "FROM flow_steps fs JOIN components c ON c.id=fs.component_id " +
            "JOIN devices d ON d.id=c.device_id WHERE fs.flow_id=? ORDER BY fs.step_index", flowId);
        flow.put("steps", steps);
        boolean online = !steps.isEmpty() && steps.stream().allMatch(s -> "ONLINE".equals(s.get("device_status")));
        flow.put("online", online);
        boolean on = !steps.isEmpty() && steps.stream().allMatch(s -> "CONFIRMED".equals(s.get("feedback_quality")) &&
            expectedState(s.get("on_action").toString()).equals(s.get("reported_state")));
        boolean off = !steps.isEmpty() && steps.stream().allMatch(s -> "CONFIRMED".equals(s.get("feedback_quality")) &&
            expectedState(s.get("off_action").toString()).equals(s.get("reported_state")));
        flow.put("currentState", online && on ? "ON" : online && off ? "OFF" : "UNKNOWN");
        List<Map<String, Object>> latest = rows("SELECT id,state,requested_action,started_at,ended_at FROM runs " +
            "WHERE flow_id=? AND corporation_id=? ORDER BY started_at DESC FETCH FIRST 1 ROWS ONLY", flowId, context.corporationId());
        flow.put("latestRun", latest.isEmpty() ? null : latest.get(0));
        return flow;
    }

    public List<Map<String, Object>> siteComponents(TenantContext context, String siteId) {
        requireSite(context, siteId, false);
        return rows("SELECT c.id,c.device_id,c.kind,c.name,c.hardware_channel,c.reported_state,c.feedback_quality," +
            "d.name AS device_name,d.status AS device_status FROM components c JOIN devices d ON d.id=c.device_id " +
            "WHERE c.corporation_id=? AND c.site_id=? ORDER BY d.name,c.name", context.corporationId(), siteId);
    }

    @Transactional
    public Map<String, Object> createFlow(TenantContext context, String siteId, String name, List<String> componentIds) {
        requireSite(context, siteId, true);
        validateComponents(context, siteId, componentIds);
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO flows(id,corporation_id,site_id,name,status,published_version,graph,shutdown_policy) " +
            "VALUES (?,?,?,?,'PUBLISHED',1,'{}','{}')", id, context.corporationId(), siteId, name.trim());
        insertSteps(context, siteId, id, componentIds);
        audit(context, siteId, "OPERATIONAL_FLOW_CREATED", id, name);
        return flow(context, id);
    }

    @Transactional
    public Map<String, Object> updateFlow(TenantContext context, String flowId, String name, List<String> componentIds) {
        Map<String, Object> existing = flow(context, flowId);
        String siteId = existing.get("site_id").toString();
        requireSite(context, siteId, true);
        lockFlow(context, flowId);
        Long active = jdbc.queryForObject("SELECT COUNT(*) FROM runs WHERE flow_id=? AND state IN ('ACCEPTED','WAITING_FEEDBACK')", Long.class, flowId);
        if (active != null && active > 0) throw conflict("FLOW_BUSY", "Wait for the active operation before editing this flow.");
        validateComponents(context, siteId, componentIds);
        jdbc.update("DELETE FROM flow_steps WHERE flow_id=?", flowId);
        insertSteps(context, siteId, flowId, componentIds);
        jdbc.update("UPDATE flows SET name=?,status='PUBLISHED',published_version=COALESCE(published_version,0)+1 WHERE id=?", name.trim(), flowId);
        jdbc.update("UPDATE schedules SET enabled=FALSE WHERE target_flow_id=?", flowId);
        audit(context, siteId, "OPERATIONAL_FLOW_UPDATED", flowId, name);
        return flow(context, flowId);
    }

    @Transactional
    public Map<String, Object> action(TenantContext context, String flowId, String action, String idempotencyKey) {
        if (!context.canControl()) throw new ApiException(HttpStatus.FORBIDDEN, "CONTROL_FORBIDDEN", "This account cannot control devices.");
        if (!Set.of("ON", "OFF").contains(action)) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ACTION", "Choose ON or OFF.");
        if (idempotencyKey == null || idempotencyKey.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "IDEMPOTENCY_REQUIRED", "An Idempotency-Key is required.");
        Map<String, Object> flow = flow(context, flowId);
        lockFlow(context, flowId);
        List<Map<String, Object>> duplicate = rows("SELECT id FROM runs WHERE corporation_id=? AND idempotency_key=?", context.corporationId(), idempotencyKey);
        if (!duplicate.isEmpty()) return run(context, duplicate.get(0).get("id").toString());
        if (!"PUBLISHED".equals(flow.get("status"))) throw conflict("FLOW_UNAVAILABLE", "Only published operational flows can be controlled.");
        @SuppressWarnings("unchecked") List<Map<String, Object>> steps = (List<Map<String, Object>>) flow.get("steps");
        if (steps.isEmpty()) throw conflict("FLOW_EMPTY", "This flow has no components.");
        if (!(Boolean) flow.get("online")) throw conflict("DEVICE_OFFLINE", "A device in this flow is offline. No command was queued.");
        if (steps.stream().anyMatch(s -> !"CONFIRMED".equals(s.get("feedback_quality"))))
            throw conflict("FEEDBACK_UNKNOWN", "Wait for confirmed component feedback before controlling this flow.");
        Long active = jdbc.queryForObject("SELECT COUNT(*) FROM runs WHERE flow_id=? AND state IN ('ACCEPTED','WAITING_FEEDBACK')", Long.class, flowId);
        if (active != null && active > 0) throw conflict("FLOW_BUSY", "A previous operation is still waiting for device confirmation.");
        String runId = UUID.randomUUID().toString();
        Instant now = Instant.now();
        jdbc.update("INSERT INTO runs(id,corporation_id,site_id,initiator_id,source,state,started_at,flow_id,requested_action,idempotency_key) " +
            "VALUES (?,?,?,?,?,'ACCEPTED',?,?,?,?)", runId, context.corporationId(), flow.get("site_id"), context.userId(),
            "FLOW", Timestamp.from(now), flowId, action, idempotencyKey);
        List<Map<String, Object>> ordered = new ArrayList<>(steps);
        if (action.equals("OFF")) java.util.Collections.reverse(ordered);
        int order = 1;
        for (Map<String, Object> step : ordered) {
            String commandAction = step.get(action.equals("ON") ? "on_action" : "off_action").toString();
            jdbc.update("INSERT INTO flow_run_steps(id,run_id,component_id,step_index,action,expected_state,state) VALUES (?,?,?,?,?,?,'WAITING')",
                UUID.randomUUID().toString(), runId, step.get("component_id"), order++, commandAction, expectedState(commandAction));
        }
        queueNextStep(runId);
        audit(context, flow.get("site_id").toString(), "OPERATIONAL_FLOW_" + action + "_REQUESTED", runId, flow.get("name").toString());
        return run(context, runId);
    }

    public Map<String, Object> run(TenantContext context, String runId) {
        Map<String, Object> run = one("SELECT r.id,r.site_id,r.flow_id,f.name AS flow_name,r.requested_action,r.state,r.started_at,r.ended_at " +
            "FROM runs r JOIN flows f ON f.id=r.flow_id WHERE r.id=? AND r.corporation_id=?", runId, context.corporationId());
        requireSite(context, run.get("site_id").toString(), false);
        run.put("steps", rows("SELECT frs.id,frs.step_index,frs.component_id,c.name AS component_name,frs.action," +
            "frs.expected_state,frs.state,frs.command_id,frs.created_at,frs.confirmed_at FROM flow_run_steps frs " +
            "JOIN components c ON c.id=frs.component_id WHERE frs.run_id=? ORDER BY frs.step_index", runId));
        return run;
    }

    public List<Map<String, Object>> history(TenantContext context, String siteId) {
        requireSite(context, siteId, false);
        return rows("SELECT r.id,r.flow_id,f.name AS flow_name,r.requested_action,r.state,r.started_at,r.ended_at " +
            "FROM runs r JOIN flows f ON f.id=r.flow_id WHERE r.corporation_id=? AND r.site_id=? " +
            "ORDER BY r.started_at DESC FETCH FIRST 50 ROWS ONLY", context.corporationId(), siteId);
    }

    public List<Map<String, Object>> readings(TenantContext context, String siteId) {
        requireSite(context, siteId, false);
        return rows("SELECT sr.id,sr.component_id,c.name AS component_name,sr.reading_value AS value,sr.unit,sr.quality,sr.measured_at " +
            "FROM sensor_readings sr JOIN components c ON c.id=sr.component_id " +
            "WHERE sr.corporation_id=? AND sr.site_id=? ORDER BY sr.measured_at DESC FETCH FIRST 100 ROWS ONLY",
            context.corporationId(), siteId);
    }

    public List<Map<String, Object>> schedules(TenantContext context, String siteId) {
        requireSite(context, siteId, false);
        return rows("SELECT id,site_id,target_flow_id,name,recurrence,next_due_at,enabled FROM schedules " +
            "WHERE corporation_id=? AND site_id=? ORDER BY name", context.corporationId(), siteId);
    }

    public List<Map<String, Object>> alerts(TenantContext context, String siteId) {
        requireSite(context, siteId, false);
        return rows("SELECT id,site_id,severity,title,detail,raised_at,acknowledged_at,resolved_at FROM alerts " +
            "WHERE corporation_id=? AND site_id=? ORDER BY raised_at DESC FETCH FIRST 50 ROWS ONLY", context.corporationId(), siteId);
    }

    private void validateComponents(TenantContext context, String siteId, List<String> componentIds) {
        if (componentIds == null || componentIds.isEmpty() || componentIds.size() > 16)
            throw new ApiException(HttpStatus.BAD_REQUEST, "FLOW_STEP_COUNT", "Choose between 1 and 16 components.");
        if (new HashSet<>(componentIds).size() != componentIds.size())
            throw new ApiException(HttpStatus.BAD_REQUEST, "FLOW_DUPLICATE_COMPONENT", "Use each component only once in a flow.");
        for (String componentId : componentIds) {
            Map<String, Object> component = one("SELECT kind FROM components WHERE id=? AND corporation_id=? AND site_id=?",
                componentId, context.corporationId(), siteId);
            if (!Set.of("VALVE", "PUMP", "MOTOR", "SWITCH", "RELAY").contains(component.get("kind")))
                throw new ApiException(HttpStatus.BAD_REQUEST, "FLOW_SENSOR_STEP", "Sensors cannot be control steps.");
        }
    }

    private void lockFlow(TenantContext context, String flowId) {
        jdbc.queryForObject("SELECT id FROM flows WHERE id=? AND corporation_id=? FOR UPDATE", String.class,
            flowId, context.corporationId());
    }

    private void insertSteps(TenantContext context, String siteId, String flowId, List<String> componentIds) {
        int order = 1;
        for (String componentId : componentIds) {
            String kind = one("SELECT kind FROM components WHERE id=?", componentId).get("kind").toString();
            String on = kind.equals("VALVE") ? "OPEN" : kind.equals("PUMP") || kind.equals("MOTOR") ? "START" : "ON";
            String off = kind.equals("VALVE") ? "CLOSE" : kind.equals("PUMP") || kind.equals("MOTOR") ? "STOP" : "OFF";
            jdbc.update("INSERT INTO flow_steps(id,corporation_id,site_id,flow_id,component_id,step_index,on_action,off_action) VALUES (?,?,?,?,?,?,?,?)",
                UUID.randomUUID().toString(), context.corporationId(), siteId, flowId, componentId, order++, on, off);
        }
    }

    void queueNextStep(String runId) {
        List<Map<String, Object>> waiting = rows("SELECT frs.id,frs.step_index,frs.component_id,frs.action,c.device_id,c.hardware_channel " +
            "FROM flow_run_steps frs JOIN components c ON c.id=frs.component_id " +
            "WHERE frs.run_id=? AND frs.state='WAITING' ORDER BY frs.step_index FETCH FIRST 1 ROWS ONLY", runId);
        if (waiting.isEmpty()) {
            jdbc.update("UPDATE runs SET state='CONFIRMED',ended_at=CURRENT_TIMESTAMP WHERE id=?", runId);
            return;
        }
        Map<String, Object> step = waiting.get(0);
        String commandId = UUID.randomUUID().toString();
        Instant now = Instant.now();
        String corporationId = one("SELECT corporation_id FROM runs WHERE id=?", runId).get("corporation_id").toString();
        jdbc.update("INSERT INTO commands(id,corporation_id,run_id,device_id,component_id,action,state,idempotency_key,expires_at,created_at,updated_at) " +
            "VALUES (?,?,?,?,?,?,'ACCEPTED',?,?,?,?)", commandId, corporationId, runId, step.get("device_id"),
            step.get("component_id"), step.get("action"), runId + ":" + step.get("step_index"),
            Timestamp.from(now.plusSeconds(45)), Timestamp.from(now), Timestamp.from(now));
        jdbc.update("UPDATE flow_run_steps SET command_id=?,state='WAITING_FEEDBACK' WHERE id=?", commandId, step.get("id"));
        jdbc.update("UPDATE runs SET state='WAITING_FEEDBACK' WHERE id=?", runId);
        String payload = "{\"commandId\":\"" + commandId + "\",\"runId\":\"" + runId + "\",\"deviceId\":\"" +
            step.get("device_id") + "\",\"componentId\":\"" + step.get("component_id") + "\",\"action\":\"" + step.get("action") + "\"}";
        jdbc.update("INSERT INTO outbox_events(id,aggregate_id,event_type,payload,created_at) VALUES (?,?,?,?,?)",
            UUID.randomUUID().toString(), commandId, "OPERATIONAL_FLOW_COMMAND", payload, Timestamp.from(now));
        mqtt.commandQueued(commandId, step.get("device_id").toString(), step.get("component_id").toString(), step.get("action").toString());
    }

    static String expectedState(String action) {
        return switch (action.toUpperCase(Locale.ROOT)) {
            case "OPEN" -> "OPEN";
            case "CLOSE" -> "CLOSED";
            case "START" -> "RUNNING";
            case "STOP" -> "STOPPED";
            case "ON" -> "ON";
            case "OFF" -> "OFF";
            default -> throw new IllegalArgumentException("Unsupported flow action: " + action);
        };
    }

    private void requireSite(TenantContext context, String siteId, boolean manage) {
        Long exists = jdbc.queryForObject("SELECT COUNT(*) FROM sites WHERE id=? AND corporation_id=? AND archived_at IS NULL", Long.class,
            siteId, context.corporationId());
        if (exists == null || exists == 0) throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Site was not found in this corporation.");
        if (manage && !context.canManage()) throw new ApiException(HttpStatus.FORBIDDEN, "MANAGE_FORBIDDEN", "Site management access is required.");
        if (context.role() == TenantContext.Role.SUPER_ADMIN || context.role() == TenantContext.Role.CORPORATE_ADMIN) return;
        List<String> grants = jdbc.queryForList("SELECT permission_profile FROM site_grants WHERE site_id=? AND corporation_id=? AND user_id=?",
            String.class, siteId, context.corporationId(), context.userId());
        if (grants.isEmpty() || manage && !grants.contains("SITE_MANAGER"))
            throw new ApiException(HttpStatus.FORBIDDEN, "SITE_ACCESS_DENIED", "This site is not assigned to your account.");
    }

    private void audit(TenantContext context, String siteId, String operation, String target, String summary) {
        jdbc.update("INSERT INTO audit_events(id,actor_id,corporation_id,site_id,operation,target,summary,occurred_at) VALUES (?,?,?,?,?,?,?,?)",
            UUID.randomUUID().toString(), context.userId(), context.corporationId(), siteId, operation, target, summary, Timestamp.from(Instant.now()));
    }

    private List<Map<String, Object>> rows(String sql, Object... args) {
        return jdbc.queryForList(sql, args).stream().map(raw -> {
            Map<String, Object> row = new HashMap<>();
            raw.forEach((key, value) -> row.put(key.toLowerCase(Locale.ROOT), value instanceof UUID uuid ? uuid.toString() :
                value instanceof Timestamp timestamp ? timestamp.toInstant().toString() : value));
            return row;
        }).toList();
    }

    private Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> found = rows(sql, args);
        if (found.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Resource was not found in this corporation.");
        return found.get(0);
    }

    private ApiException conflict(String code, String message) { return new ApiException(HttpStatus.CONFLICT, code, message); }
}
