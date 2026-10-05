package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.agrothulir.config.TenantContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class PlatformService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final MqttDeviceService mqtt;
    public PlatformService(JdbcTemplate jdbc, ObjectMapper json, MqttDeviceService mqtt) { this.jdbc = jdbc; this.json = json; this.mqtt = mqtt; }

    public Map<String, Object> me(TenantContext context) {
        Map<String, Object> user = one("SELECT id, display_name, account_status FROM users WHERE id = ?", context.userId());
        user.put("activeCorporationId", context.corporationId());
        user.put("role", context.role().name());
        return user;
    }

    public List<Map<String, Object>> workspaces(TenantContext context) {
        return maps("SELECT c.id, c.workspace_code, c.name, c.status, c.default_timezone, m.corporate_role FROM corporations c JOIN corporation_memberships m ON m.corporation_id=c.id WHERE m.user_id=? AND m.status='ACTIVE' AND c.status='ACTIVE' ORDER BY c.name,c.id", context.userId());
    }

    public List<Map<String, Object>> corporations(TenantContext context) {
        requirePlatform(context);
        return maps("SELECT id, workspace_code, name, status, default_timezone, created_at FROM corporations ORDER BY name");
    }

    @Transactional
    public Map<String, Object> createCorporation(TenantContext context, String name, String workspaceCode, String timezone) {
        requirePlatform(context);
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO corporations(id,workspace_code,name,status,default_timezone) VALUES (?,?,?,'ACTIVE',?)", id, workspaceCode.toUpperCase(Locale.ROOT), name, timezone);
        audit(context, "CORPORATION_CREATED", id, name);
        return one("SELECT id,workspace_code,name,status,default_timezone FROM corporations WHERE id=?", id);
    }

    public Map<String, Object> platformOverview(TenantContext context) {
        requirePlatform(context);
        long critical = count("SELECT COUNT(*) FROM alerts WHERE severity='CRITICAL' AND resolved_at IS NULL");
        long backlog = count("SELECT COUNT(*) FROM outbox_events WHERE dispatched_at IS NULL");
        return Map.of(
            "corporations", count("SELECT COUNT(*) FROM corporations"),
            "sites", count("SELECT COUNT(*) FROM sites WHERE archived_at IS NULL"),
            "devicesOnline", count("SELECT COUNT(*) FROM devices WHERE status='ONLINE'"),
            "openCriticalAlerts", critical,
            "outboxBacklog", backlog,
            "health", critical > 0 || backlog > 0 ? "ATTENTION" : "HEALTHY"
        );
    }

    public List<Map<String, Object>> sites(TenantContext context) {
        if (context.role() == TenantContext.Role.CORPORATE_ADMIN || context.role() == TenantContext.Role.SUPER_ADMIN) {
            return maps("SELECT id,name,type,location,timezone,health,moisture,pressure FROM sites WHERE corporation_id=? AND archived_at IS NULL ORDER BY name", context.corporationId());
        }
        return maps("SELECT s.id,s.name,s.type,s.location,s.timezone,s.health,s.moisture,s.pressure,g.permission_profile FROM sites s JOIN site_grants g ON g.site_id=s.id AND g.corporation_id=s.corporation_id WHERE s.corporation_id=? AND g.user_id=? AND s.archived_at IS NULL ORDER BY s.name", context.corporationId(), context.userId());
    }

    public Map<String, Object> site(TenantContext context, String siteId) {
        requireSiteAccess(context, siteId);
        Map<String, Object> site = one("SELECT id,name,type,location,timezone,health,moisture,pressure FROM sites WHERE id=? AND corporation_id=?", siteId, context.corporationId());
        site.put("zones", maps("SELECT z.id,z.site_id,z.name,COUNT(d.id) AS device_count,SUM(CASE WHEN d.status='ONLINE' THEN 1 ELSE 0 END) AS online_count FROM zones z LEFT JOIN devices d ON d.zone_id=z.id AND d.corporation_id=z.corporation_id WHERE z.corporation_id=? AND z.site_id=? GROUP BY z.id,z.site_id,z.name ORDER BY z.name", context.corporationId(), siteId));
        site.put("deviceCounts", one("SELECT COUNT(*) AS total, SUM(CASE WHEN status='ONLINE' THEN 1 ELSE 0 END) AS online FROM devices WHERE corporation_id=? AND site_id=?", context.corporationId(), siteId));
        return site;
    }

    public List<Map<String, Object>> zones(TenantContext context) {
        String access = " AND (EXISTS(SELECT 1 FROM site_grants g WHERE g.site_id=z.site_id AND g.user_id=?) OR ? IN ('CORPORATE_ADMIN','SUPER_ADMIN')) ";
        return maps("SELECT z.id,z.site_id,z.name,s.name AS site_name,s.location,s.health,COUNT(d.id) AS device_count," +
            "SUM(CASE WHEN d.status='ONLINE' THEN 1 ELSE 0 END) AS online_count FROM zones z JOIN sites s ON s.id=z.site_id " +
            "LEFT JOIN devices d ON d.zone_id=z.id AND d.corporation_id=z.corporation_id WHERE z.corporation_id=?" + access +
            "GROUP BY z.id,z.site_id,z.name,s.name,s.location,s.health ORDER BY s.name,z.name",
            context.corporationId(), context.userId(), context.role().name());
    }

    public Map<String, Object> zone(TenantContext context, String zoneId) {
        Map<String, Object> zone = one("SELECT z.id,z.site_id,z.name,s.name AS site_name,s.location,s.health FROM zones z JOIN sites s ON s.id=z.site_id WHERE z.id=? AND z.corporation_id=?", zoneId, context.corporationId());
        requireSiteAccess(context, Objects.toString(zone.get("site_id")));
        zone.put("devices", devices(context, Objects.toString(zone.get("site_id")), zoneId));
        return zone;
    }

    public List<Map<String, Object>> devices(TenantContext context, String siteId, String zoneId) {
        String resolvedSite = siteId;
        if ((resolvedSite == null || resolvedSite.isBlank()) && zoneId != null && !zoneId.isBlank())
            resolvedSite = Objects.toString(one("SELECT site_id FROM zones WHERE id=? AND corporation_id=?", zoneId, context.corporationId()).get("site_id"));
        if (resolvedSite == null || resolvedSite.isBlank())
            throw new ApiException(HttpStatus.BAD_REQUEST, "SITE_OR_ZONE_REQUIRED", "Choose a site or zone.");
        requireSiteAccess(context, resolvedSite);
        String zoneFilter = zoneId == null || zoneId.isBlank() ? "" : " AND d.zone_id=?";
        String sql = "SELECT d.id,d.site_id,d.zone_id,z.name AS zone_name,d.name,d.model,d.firmware,d.serial,d.status,d.last_seen_at," +
            "(SELECT COUNT(*) FROM components c WHERE c.device_id=d.id AND c.kind IN ('PUMP','VALVE','MOTOR','SWITCH','RELAY')) AS actuator_count," +
            "(SELECT COUNT(*) FROM components c WHERE c.device_id=d.id AND c.kind='SENSOR') AS sensor_count " +
            "FROM devices d LEFT JOIN zones z ON z.id=d.zone_id WHERE d.corporation_id=? AND d.site_id=?" + zoneFilter + " ORDER BY d.name";
        return zoneId == null || zoneId.isBlank() ? maps(sql, context.corporationId(), resolvedSite) :
            maps(sql, context.corporationId(), resolvedSite, zoneId);
    }

    public List<Map<String, Object>> devices(TenantContext context, String siteId) { return devices(context, siteId, null); }

    public Map<String, Object> device(TenantContext context, String deviceId) {
        Map<String, Object> device = one("SELECT d.id,d.site_id,d.zone_id,z.name AS zone_name,s.name AS site_name,d.name,d.model,d.firmware,d.status,d.last_seen_at,d.serial FROM devices d JOIN sites s ON s.id=d.site_id LEFT JOIN zones z ON z.id=d.zone_id WHERE d.id=? AND d.corporation_id=?", deviceId, context.corporationId());
        requireSiteAccess(context, Objects.toString(device.get("site_id")));
        device.put("components", components(context, deviceId));
        return device;
    }

    public Map<String, Object> capabilities(TenantContext context, String deviceId) {
        Map<String, Object> device = device(context, deviceId);
        List<Map<String, Object>> components = components(context, deviceId);
        return Map.of("deviceId", deviceId, "model", device.get("model"), "version", Objects.toString(device.get("firmware"), "unknown"),
            "actions", components.stream().anyMatch(c -> "PUMP".equals(c.get("kind"))) ? List.of("START", "SAFE_STOP") : List.of(),
            "channels", components.stream().map(c -> Objects.toString(c.get("hardware_channel"))).toList());
    }

    public List<Map<String, Object>> components(TenantContext context, String deviceId) {
        Map<String, Object> device = one("SELECT site_id FROM devices WHERE id=? AND corporation_id=?", deviceId, context.corporationId());
        requireSiteAccess(context, Objects.toString(device.get("site_id")));
        return maps("SELECT id,device_id,kind,name,hardware_channel,reported_state,feedback_quality,latest_value,state_version,measured_at,display_order FROM components WHERE corporation_id=? AND device_id=? ORDER BY display_order,name", context.corporationId(), deviceId);
    }

    public Map<String, Object> diagnostics(TenantContext context, String deviceId) {
        Map<String, Object> device = device(context, deviceId);
        String seen = Objects.toString(device.get("last_seen_at"), "");
        long lag = seen.isEmpty() ? -1 : Math.max(0, ChronoUnit.SECONDS.between(Instant.parse(seen), Instant.now()));
        return Map.of("deviceId", deviceId, "status", device.get("status"), "mqtt", mqtt.connectionStatus(),
            "telemetryLagSeconds", lag, "configuration", "UNKNOWN");
    }

    public Map<String, Object> topology(TenantContext context, String siteId) {
        Map<String, Object> site = site(context, siteId);
        Map<String, Object> corporation = one("SELECT id,name FROM corporations WHERE id=?", context.corporationId());
        List<Map<String, Object>> deviceRows = maps("SELECT id,zone_id,name FROM devices WHERE site_id=? AND corporation_id=? ORDER BY name", siteId, context.corporationId());
        List<Map<String, Object>> componentRows = maps("SELECT id,device_id,name,kind FROM components WHERE site_id=? AND corporation_id=? ORDER BY device_id,display_order,name", siteId, context.corporationId());
        @SuppressWarnings("unchecked") List<Map<String, Object>> zoneRows = (List<Map<String, Object>>) site.get("zones");
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> connections = new ArrayList<>();
        nodes.add(Map.of("id", corporation.get("id"), "type", "CORPORATION", "name", corporation.get("name")));
        nodes.add(Map.of("id", siteId, "type", "SITE", "name", site.get("name")));
        connections.add(Map.of("from", corporation.get("id"), "to", siteId, "type", "CONTAINS"));
        zoneRows.forEach(zone -> {
            nodes.add(Map.of("id", zone.get("id"), "type", "ZONE", "name", zone.get("name")));
            connections.add(Map.of("from", siteId, "to", zone.get("id"), "type", "CONTAINS"));
        });
        boolean complete = deviceRows.stream().allMatch(device -> device.get("zone_id") != null);
        deviceRows.forEach(device -> {
            nodes.add(Map.of("id", device.get("id"), "type", "DEVICE", "name", device.get("name")));
            Object parent = device.get("zone_id") == null ? siteId : device.get("zone_id");
            connections.add(Map.of("from", parent, "to", device.get("id"),
                "type", device.get("zone_id") == null ? "LEGACY_UNASSIGNED" : "CONTAINS"));
        });
        componentRows.forEach(component -> {
            nodes.add(Map.of("id", component.get("id"), "type", "COMPONENT", "name", component.get("name"), "kind", component.get("kind")));
            connections.add(Map.of("from", component.get("device_id"), "to", component.get("id"), "type", "CONTAINS"));
        });
        return Map.of("siteId", siteId, "status", complete ? "CONFIGURED" : "NEEDS_ZONE_ASSIGNMENT",
            "nodes", nodes, "connections", connections);
    }

    public String pumpForFlow(TenantContext context, String flowId) {
        Map<String, Object> flow = one("SELECT site_id,status FROM flows WHERE id=? AND corporation_id=?", flowId, context.corporationId());
        requireSiteAccess(context, Objects.toString(flow.get("site_id")));
        if (!"PUBLISHED".equals(flow.get("status")))
            throw new ApiException(HttpStatus.CONFLICT, "FLOW_NOT_PUBLISHED", "Publish this flow before running it.");
        List<String> pumps = jdbc.queryForList("SELECT id FROM components WHERE site_id=? AND corporation_id=? AND kind='PUMP' ORDER BY id",
            String.class, flow.get("site_id"), context.corporationId());
        if (pumps.isEmpty()) throw new ApiException(HttpStatus.CONFLICT, "PUMP_NOT_FOUND", "This flow has no pump in its site.");
        return pumps.get(0);
    }

    public String pumpForRun(TenantContext context, String runId) {
        Map<String, Object> run = run(context, runId);
        requireSiteAccess(context, Objects.toString(run.get("site_id")));
        List<String> pumps = jdbc.queryForList("SELECT c.component_id FROM commands c WHERE c.run_id=? AND c.corporation_id=? ORDER BY c.created_at",
            String.class, runId, context.corporationId());
        if (pumps.isEmpty()) throw new ApiException(HttpStatus.CONFLICT, "PUMP_NOT_FOUND", "No component is associated with this run.");
        return pumps.get(0);
    }

    public Map<String, Object> schedulePreview(TenantContext context, String scheduleId) {
        Map<String, Object> row = one("SELECT site_id,timezone,next_due_at FROM schedules WHERE id=? AND corporation_id=?", scheduleId, context.corporationId());
        requireSiteAccess(context, Objects.toString(row.get("site_id")));
        Object due = row.get("next_due_at");
        return Map.of("scheduleId", scheduleId, "timezone", row.get("timezone"), "dstPolicy", "NOT_CONFIGURED",
            "occurrences", due == null ? List.of() : List.of(due));
    }

    public List<Map<String, Object>> flows(TenantContext context) {
        return maps("SELECT f.id,f.site_id,f.name,f.status,f.published_version,f.config_hash FROM flows f WHERE f.corporation_id=? AND (EXISTS(SELECT 1 FROM site_grants g WHERE g.site_id=f.site_id AND g.user_id=?) OR ? IN ('CORPORATE_ADMIN','SUPER_ADMIN')) ORDER BY f.name", context.corporationId(), context.userId(), context.role().name());
    }

    public Map<String, Object> validateFlow(TenantContext context, String flowId) {
        Map<String, Object> flow = one("SELECT site_id,graph,shutdown_policy FROM flows WHERE id=? AND corporation_id=?", flowId, context.corporationId());
        requireSiteAccess(context, Objects.toString(flow.get("site_id")));
        List<String> checks = new ArrayList<>();
        try {
            JsonNode graph = json.readTree(Objects.toString(flow.get("graph"), "{}"));
            JsonNode policy = json.readTree(Objects.toString(flow.get("shutdown_policy"), "{}"));
            JsonNode nodes = graph.path("nodes");
            if ((nodes.isArray() && !nodes.isEmpty()) || (nodes.isNumber() && nodes.asInt() > 0)) checks.add("HAS_NODES");
            if (graph.path("bounded").asBoolean(false)) checks.add("BOUNDED_EXECUTION");
            if (policy.path("safeStop").asBoolean(false)) checks.add("SAFE_STOP");
        } catch (Exception ex) {
            return Map.of("flowId", flowId, "valid", false, "checks", List.of("INVALID_GRAPH_JSON"));
        }
        return Map.of("flowId", flowId, "valid", checks.containsAll(List.of("HAS_NODES", "BOUNDED_EXECUTION", "SAFE_STOP")), "checks", checks);
    }

    @Transactional
    public Map<String, Object> publishFlow(TenantContext context, String flowId) {
        requireManage(context);
        Map<String, Object> flow = one("SELECT id,site_id,status,published_version,graph,shutdown_policy FROM flows WHERE id=? AND corporation_id=?", flowId, context.corporationId());
        requireSiteAccess(context, Objects.toString(flow.get("site_id")));
        if (!Boolean.TRUE.equals(validateFlow(context, flowId).get("valid")))
            throw new ApiException(HttpStatus.CONFLICT, "FLOW_INVALID", "The flow needs nodes, bounded execution, and safe stop before publishing.");
        int version = flow.get("published_version") == null ? 1 : ((Number) flow.get("published_version")).intValue() + 1;
        jdbc.update("UPDATE flows SET status='PUBLISHED',published_version=?,config_hash=? WHERE id=? AND corporation_id=?", version,
            hash(Objects.toString(flow.get("graph")) + Objects.toString(flow.get("shutdown_policy"))), flowId, context.corporationId());
        audit(context, "FLOW_PUBLISHED", flowId, "Published immutable version " + version);
        return Map.of("flowId", flowId, "version", version, "status", "PUBLISHED", "scheduleMigrationRequired", true);
    }

    public List<Map<String, Object>> schedules(TenantContext context) {
        return maps("SELECT s.id,s.site_id,s.target_flow_id,s.flow_version,s.name,s.timezone,s.recurrence,s.next_due_at,s.missed_policy,s.enabled FROM schedules s WHERE s.corporation_id=? AND (EXISTS(SELECT 1 FROM site_grants g WHERE g.site_id=s.site_id AND g.user_id=?) OR ? IN ('CORPORATE_ADMIN','SUPER_ADMIN')) ORDER BY s.name", context.corporationId(), context.userId(), context.role().name());
    }

    @Transactional
    public Map<String, Object> pauseSchedule(TenantContext context, String scheduleId, boolean enabled) {
        requireManage(context);
        Map<String, Object> schedule = one("SELECT site_id FROM schedules WHERE id=? AND corporation_id=?", scheduleId, context.corporationId());
        requireSiteAccess(context, Objects.toString(schedule.get("site_id")));
        int updated = jdbc.update("UPDATE schedules SET enabled=? WHERE id=? AND corporation_id=?", enabled, scheduleId, context.corporationId());
        if (updated == 0) notFound();
        audit(context, enabled ? "SCHEDULE_ENABLED" : "SCHEDULE_PAUSED", scheduleId, "Future occurrences only");
        return Map.of("id", scheduleId, "enabled", enabled, "activeRunAffected", false);
    }

    public List<Map<String, Object>> alerts(TenantContext context) {
        return maps("SELECT a.id,a.site_id,a.severity,a.title,a.detail,a.raised_at,a.acknowledged_by,a.acknowledged_at,a.resolved_at FROM alerts a WHERE a.corporation_id=? AND (EXISTS(SELECT 1 FROM site_grants g WHERE g.site_id=a.site_id AND g.user_id=?) OR ? IN ('CORPORATE_ADMIN','SUPER_ADMIN')) ORDER BY a.raised_at DESC", context.corporationId(), context.userId(), context.role().name());
    }

    @Transactional
    public Map<String, Object> acknowledgeAlert(TenantContext context, String alertId) {
        Map<String, Object> alert = one("SELECT site_id FROM alerts WHERE id=? AND corporation_id=?", alertId, context.corporationId());
        requireSiteAccess(context, Objects.toString(alert.get("site_id")));
        int updated = jdbc.update("UPDATE alerts SET acknowledged_by=?,acknowledged_at=CURRENT_TIMESTAMP WHERE id=? AND corporation_id=? AND acknowledged_at IS NULL", context.userId(), alertId, context.corporationId());
        if (updated == 0 && count("SELECT COUNT(*) FROM alerts WHERE id=? AND corporation_id=?", alertId, context.corporationId()) == 0) notFound();
        audit(context, "ALERT_ACKNOWLEDGED", alertId, "Acknowledged; resolution remains independent");
        return one("SELECT id,severity,title,acknowledged_by,acknowledged_at,resolved_at FROM alerts WHERE id=? AND corporation_id=?", alertId, context.corporationId());
    }

    @Transactional
    public CommandReceipt command(TenantContext context, String componentId, String idempotencyKey, CommandRequest request) {
        if (!context.canControl()) throw new ApiException(HttpStatus.FORBIDDEN, "CONTROL_FORBIDDEN", "View-only access cannot issue equipment commands.");
        // The obsolete protected-pump prototype has no MQTT executor. Never accept
        // an undeliverable command or bypass the sequential flow safety checks.
        if (mqtt.isEnabled()) throw new ApiException(HttpStatus.CONFLICT, "FLOW_CONTROL_REQUIRED",
            "Use the device Start/Stop operational flow. Legacy component commands are not supported by the MQTT executor.");
        List<Map<String, Object>> duplicate = maps("SELECT id,run_id,state FROM commands WHERE corporation_id=? AND idempotency_key=?", context.corporationId(), idempotencyKey);
        if (!duplicate.isEmpty()) return receipt(duplicate.get(0));

        Map<String, Object> component = one("SELECT c.id,c.site_id,c.device_id,c.kind,c.reported_state,c.feedback_quality,d.status AS device_status,co.status AS corporation_status FROM components c JOIN devices d ON d.id=c.device_id AND d.corporation_id=c.corporation_id JOIN corporations co ON co.id=c.corporation_id WHERE c.id=? AND c.corporation_id=?", componentId, context.corporationId());
        requireSiteAccess(context, Objects.toString(component.get("site_id")));
        String action = request.action().toUpperCase(Locale.ROOT);
        if (!Set.of("START", "SAFE_STOP").contains(action)) throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_ACTION", "Only START and SAFE_STOP are supported for this component.");
        String valveId = null;
        if (action.equals("START")) {
            if (!"ACTIVE".equals(component.get("corporation_status"))) throw new ApiException(HttpStatus.CONFLICT, "CORPORATION_SUSPENDED", "New remote starts are disabled for this workspace.");
            if (!"ONLINE".equals(component.get("device_status"))) throw new ApiException(HttpStatus.CONFLICT, "DEVICE_OFFLINE", "The controller is offline. No start was queued for reconnect.");
            if (!"PUMP".equals(component.get("kind"))) throw new ApiException(HttpStatus.CONFLICT, "CAPABILITY_MISMATCH", "This component does not support protected start.");
            List<String> valves = jdbc.queryForList("SELECT id FROM components WHERE corporation_id=? AND site_id=? AND device_id=? AND kind='VALVE' ORDER BY id",
                String.class, context.corporationId(), component.get("site_id"), component.get("device_id"));
            if (valves.isEmpty()) throw new ApiException(HttpStatus.CONFLICT, "CAPABILITY_MISMATCH", "This pump has no protected valve.");
            valveId = valves.get(0);
            long held = count("SELECT COUNT(*) FROM resource_reservations WHERE resource_id IN (?,?) AND expires_at>CURRENT_TIMESTAMP", componentId, valveId);
            if (held > 0) throw new ApiException(HttpStatus.CONFLICT, "RESOURCE_BUSY", "Required pump or valve resources are owned by another run.");
            long confirmedValve = count("SELECT COUNT(*) FROM components WHERE id=? AND corporation_id=? AND feedback_quality='CONFIRMED'", valveId, context.corporationId());
            if (confirmedValve == 0) throw new ApiException(HttpStatus.CONFLICT, "STALE_STATE", "Fresh valve feedback is required before this protected start.");
        }

        Instant now = Instant.now();
        String runId = UUID.randomUUID().toString();
        String commandId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO runs(id,corporation_id,site_id,initiator_id,source,state,started_at) VALUES (?,?,?,?,?,'ACCEPTED',?)", runId, context.corporationId(), component.get("site_id"), context.userId(), "MANUAL", Timestamp.from(now));
        jdbc.update("INSERT INTO commands(id,corporation_id,run_id,device_id,component_id,action,state,idempotency_key,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,'ACCEPTED',?,?,?,?)", commandId, context.corporationId(), runId, component.get("device_id"), componentId, action, idempotencyKey, Timestamp.from(now.plus(15, ChronoUnit.SECONDS)), Timestamp.from(now), Timestamp.from(now));
        if (action.equals("START")) {
            Instant lockExpiry = now.plus(request.durationSeconds() + 300L, ChronoUnit.SECONDS);
            jdbc.update("INSERT INTO resource_reservations(resource_id,owner_run,fencing_generation,expires_at) VALUES (?,?,?,?)", componentId, runId, now.toEpochMilli(), Timestamp.from(lockExpiry));
            jdbc.update("INSERT INTO resource_reservations(resource_id,owner_run,fencing_generation,expires_at) VALUES (?,?,?,?)", valveId, runId, now.toEpochMilli(), Timestamp.from(lockExpiry));
        }
        String payload = "{\"commandId\":\"" + commandId + "\",\"runId\":\"" + runId + "\",\"action\":\"" + action + "\",\"expiresAt\":\"" + now.plusSeconds(15) + "\"}";
        jdbc.update("INSERT INTO outbox_events(id,aggregate_id,event_type,payload,created_at) VALUES (?,?,?,?,?)", UUID.randomUUID().toString(), commandId, "DEVICE_COMMAND_REQUESTED", payload, Timestamp.from(now));
        audit(context, "COMMAND_ACCEPTED", commandId, action + " for " + componentId);
        return new CommandReceipt(commandId, runId, "ACCEPTED", "/v1/commands/" + commandId);
    }

    public Map<String, Object> command(TenantContext context, String commandId) {
        return one("SELECT id,run_id,component_id,action,state,expires_at,created_at,updated_at FROM commands WHERE id=? AND corporation_id=?", commandId, context.corporationId());
    }

    public Map<String, Object> run(TenantContext context, String runId) {
        return one("SELECT id,site_id,initiator_id,source,state,started_at,ended_at FROM runs WHERE id=? AND corporation_id=?", runId, context.corporationId());
    }

    public List<Map<String, Object>> audit(TenantContext context) {
        String sql = context.isPlatformAdmin() ? "SELECT * FROM audit_events ORDER BY occurred_at DESC FETCH FIRST 100 ROWS ONLY" : "SELECT * FROM audit_events WHERE corporation_id=? ORDER BY occurred_at DESC FETCH FIRST 100 ROWS ONLY";
        return context.isPlatformAdmin() ? maps(sql) : maps(sql, context.corporationId());
    }

    private void requireSiteAccess(TenantContext context, String siteId) {
        long exists = count("SELECT COUNT(*) FROM sites WHERE id=? AND corporation_id=?", siteId, context.corporationId());
        if (exists == 0) notFound();
        if (context.role() == TenantContext.Role.CORPORATE_ADMIN || context.role() == TenantContext.Role.SUPER_ADMIN) return;
        if (count("SELECT COUNT(*) FROM site_grants WHERE site_id=? AND corporation_id=? AND user_id=?", siteId, context.corporationId(), context.userId()) == 0)
            throw new ApiException(HttpStatus.FORBIDDEN, "SITE_ACCESS_DENIED", "You do not have access to this site.");
    }
    private void requireManage(TenantContext context) { if (!context.canManage()) throw new ApiException(HttpStatus.FORBIDDEN, "MANAGEMENT_FORBIDDEN", "This role cannot change configuration."); }
    private void requirePlatform(TenantContext context) { if (!context.isPlatformAdmin()) throw new ApiException(HttpStatus.FORBIDDEN, "PLATFORM_ADMIN_REQUIRED", "Platform administration access is required."); }
    private void audit(TenantContext c, String operation, String target, String summary) { jdbc.update("INSERT INTO audit_events(id,actor_id,corporation_id,operation,target,summary,occurred_at) VALUES (?,?,?,?,?,?,?)", UUID.randomUUID().toString(), c.userId(), c.corporationId(), operation, target, summary, Timestamp.from(Instant.now())); }
    private CommandReceipt receipt(Map<String, Object> row) { return new CommandReceipt(Objects.toString(row.get("id")), Objects.toString(row.get("run_id")), Objects.toString(row.get("state")), "/v1/commands/" + row.get("id")); }
    private long count(String sql, Object... args) { Long value = jdbc.queryForObject(sql, Long.class, args); return value == null ? 0 : value; }
    private String hash(String value) {
        try { return "sha256:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception ex) { throw new IllegalStateException(ex); }
    }
    private Map<String, Object> one(String sql, Object... args) { List<Map<String, Object>> rows = maps(sql, args); if (rows.isEmpty()) notFound(); return rows.get(0); }
    private List<Map<String, Object>> maps(String sql, Object... args) {
        return jdbc.query(sql, (rs, rowNum) -> {
            var meta = rs.getMetaData(); Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= meta.getColumnCount(); i++) { Object value = rs.getObject(i); if (value instanceof Timestamp t) value = t.toInstant().toString(); if (value instanceof UUID uuid) value = uuid.toString(); row.put(meta.getColumnLabel(i).toLowerCase(Locale.ROOT), value); }
            return row;
        }, args);
    }
    private void notFound() { throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "The requested resource was not found in this workspace."); }

    public record CommandRequest(String action, int durationSeconds) {
        public CommandRequest { if (durationSeconds <= 0) durationSeconds = 900; if (durationSeconds > 86400) durationSeconds = 86400; }
    }
    public record CommandReceipt(String commandId, String runId, String state, String statusUrl) {}
}
