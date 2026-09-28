package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.agrothulir.config.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.sql.Timestamp;
import java.time.Instant;

@Service
public class AdminService {
    private final JdbcTemplate jdbc;
    private final AuthService auth;
    public AdminService(JdbcTemplate jdbc, AuthService auth) { this.jdbc = jdbc; this.auth = auth; }

    public List<Map<String, Object>> users(TenantContext context) {
        requireCorporate(context);
        return jdbc.queryForList("SELECT u.id,u.email,u.display_name,u.account_status, " +
            "CASE WHEN m.corporate_role='MEMBER' THEN COALESCE((SELECT MAX(g.permission_profile) FROM site_grants g WHERE g.user_id=u.id AND g.corporation_id=m.corporation_id),'VIEWER') ELSE m.corporate_role END AS corporate_role FROM users u " +
            "JOIN corporation_memberships m ON m.user_id=u.id WHERE m.corporation_id=? ORDER BY u.display_name", context.corporationId());
    }

    @Transactional
    public Map<String, Object> createUser(TenantContext context, String email, String name, String password, String role, String siteId) {
        requireCorporate(context);
        if (!List.of("CORPORATE_ADMIN", "SITE_MANAGER", "OPERATOR", "VIEWER").contains(role))
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Choose a valid workspace role.");
        if (role.equals("CORPORATE_ADMIN") && context.role() != TenantContext.Role.SUPER_ADMIN)
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "Only a platform admin may add corporate admins.");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(email)=LOWER(?)", Long.class, email) > 0)
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "This email is already registered.");
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users(id,identity_subject,display_name,account_status,email,password_hash) VALUES (?,?,?,'ACTIVE',?,?)",
            id, "local|" + email.toLowerCase(), name, email.toLowerCase(), auth.encodePassword(password));
        jdbc.update("INSERT INTO corporation_memberships VALUES (?,?,?,'ACTIVE')", context.corporationId(), id,
            role.equals("CORPORATE_ADMIN") ? role : "MEMBER");
        if (!role.equals("CORPORATE_ADMIN")) {
            if (siteId == null || siteId.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "SITE_REQUIRED", "Choose a site for this role.");
            requireSite(context, siteId);
            jdbc.update("INSERT INTO site_grants VALUES (?,?,?,?)", context.corporationId(), siteId, id, role);
        }
        audit(context, "USER_CREATED", id, email);
        return Map.of("id", id, "email", email.toLowerCase(), "display_name", name, "role", role);
    }

    @Transactional
    public Map<String, Object> createSite(TenantContext context, String name, String type, String location) {
        requireCorporate(context);
        String id = UUID.randomUUID().toString();
        String timezone = jdbc.queryForObject("SELECT default_timezone FROM corporations WHERE id=?", String.class, context.corporationId());
        jdbc.update("INSERT INTO sites(id,corporation_id,name,type,location,timezone,health) VALUES (?,?,?,?,?,?,'HEALTHY')",
            id, context.corporationId(), name, type, location, timezone);
        audit(context, "SITE_CREATED", id, name);
        return Map.of("id", id, "name", name, "type", type, "location", location);
    }

    @Transactional
    public Map<String, Object> createZone(TenantContext context, String siteId, String name) {
        if (!context.canManage()) throw new ApiException(HttpStatus.FORBIDDEN, "MANAGE_FORBIDDEN", "Site management access is required.");
        requireSite(context, siteId);
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO zones(id,corporation_id,site_id,name) VALUES (?,?,?,?)",
            id, context.corporationId(), siteId, name);
        audit(context, "ZONE_CREATED", id, name);
        return Map.of("id", id, "site_id", siteId, "name", name);
    }

    @Transactional
    public Map<String, Object> createDevice(TenantContext context, String siteId, String zoneId, String serial, String name, String model) {
        if (!context.canManage()) throw new ApiException(HttpStatus.FORBIDDEN, "MANAGE_FORBIDDEN", "Site management access is required.");
        requireSite(context, siteId);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM zones WHERE id=? AND site_id=? AND corporation_id=?", Long.class,
            zoneId, siteId, context.corporationId()) == 0)
            throw new ApiException(HttpStatus.BAD_REQUEST, "ZONE_REQUIRED", "Choose a zone that belongs to this site.");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM devices WHERE serial=?", Long.class, serial) > 0)
            throw new ApiException(HttpStatus.CONFLICT, "SERIAL_EXISTS", "This serial is already registered.");
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO devices(id,corporation_id,site_id,zone_id,serial,name,model,status) VALUES (?,?,?,?,?,?,?,'OFFLINE')",
            id, context.corporationId(), siteId, zoneId, serial, name, model);
        audit(context, "DEVICE_REGISTERED", id, serial);
        return Map.of("id", id, "site_id", siteId, "zone_id", zoneId, "serial", serial, "name", name, "model", model, "status", "OFFLINE");
    }

    @Transactional
    public Map<String, Object> createComponent(TenantContext context, String deviceId, String kind, String name, String channel) {
        if (!context.canManage()) throw new ApiException(HttpStatus.FORBIDDEN, "MANAGE_FORBIDDEN", "Site management access is required.");
        if (!List.of("VALVE", "PUMP", "MOTOR", "SWITCH", "RELAY", "SENSOR").contains(kind))
            throw new ApiException(HttpStatus.BAD_REQUEST, "COMPONENT_KIND", "Choose a supported component type.");
        List<Map<String, Object>> devices = jdbc.queryForList("SELECT site_id FROM devices WHERE id=? AND corporation_id=?", deviceId, context.corporationId());
        if (devices.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Device was not found in this corporation.");
        String siteId = devices.get(0).get("site_id").toString();
        requireSite(context, siteId);
        Long existing = jdbc.queryForObject("SELECT COUNT(*) FROM components WHERE device_id=? AND hardware_channel=?", Long.class, deviceId, channel);
        if (existing != null && existing > 0) throw new ApiException(HttpStatus.CONFLICT, "CHANNEL_EXISTS", "This hardware channel is already registered.");
        String id = UUID.randomUUID().toString();
        Integer nextOrder = jdbc.queryForObject("SELECT COALESCE(MAX(display_order),0)+1 FROM components WHERE device_id=?", Integer.class, deviceId);
        jdbc.update("INSERT INTO components(id,corporation_id,site_id,device_id,kind,name,hardware_channel,feedback_quality,display_order) " +
            "VALUES (?,?,?,?,?,?,?,'UNKNOWN',?)", id, context.corporationId(), siteId, deviceId, kind, name, channel, nextOrder);
        audit(context, "COMPONENT_REGISTERED", id, name);
        return Map.of("id", id, "device_id", deviceId, "kind", kind, "name", name, "hardware_channel", channel,
            "display_order", nextOrder == null ? 1 : nextOrder);
    }

    @Transactional
    public Map<String, Object> updateComponent(TenantContext context, String componentId, String kind, String name,
        String channel, int displayOrder) {
        if (!context.canManage()) throw new ApiException(HttpStatus.FORBIDDEN, "MANAGE_FORBIDDEN", "Site management access is required.");
        if (!List.of("VALVE", "PUMP", "MOTOR", "SWITCH", "RELAY", "SENSOR").contains(kind))
            throw new ApiException(HttpStatus.BAD_REQUEST, "COMPONENT_KIND", "Choose a supported component type.");
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT site_id,device_id FROM components WHERE id=? AND corporation_id=?",
            componentId, context.corporationId());
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Component was not found in this corporation.");
        requireSite(context, rows.get(0).get("site_id").toString());
        Long duplicate = jdbc.queryForObject("SELECT COUNT(*) FROM components WHERE device_id=? AND hardware_channel=? AND id<>?",
            Long.class, rows.get(0).get("device_id"), channel, componentId);
        if (duplicate != null && duplicate > 0)
            throw new ApiException(HttpStatus.CONFLICT, "CHANNEL_EXISTS", "This hardware channel is already registered.");
        jdbc.update("UPDATE components SET kind=?,name=?,hardware_channel=?,display_order=? WHERE id=? AND corporation_id=?",
            kind, name, channel, Math.max(0, displayOrder), componentId, context.corporationId());
        audit(context, "COMPONENT_UPDATED", componentId, name);
        return Map.of("id", componentId, "kind", kind, "name", name, "hardware_channel", channel,
            "display_order", Math.max(0, displayOrder));
    }

    private void requireCorporate(TenantContext context) {
        if (context.role() != TenantContext.Role.SUPER_ADMIN && context.role() != TenantContext.Role.CORPORATE_ADMIN)
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "Corporate administration access is required.");
    }
    private void requireSite(TenantContext context, String siteId) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM sites WHERE id=? AND corporation_id=? AND archived_at IS NULL", Long.class,
            siteId, context.corporationId());
        if (count == null || count == 0) throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Site was not found in this workspace.");
        if (context.role() == TenantContext.Role.SITE_MANAGER && jdbc.queryForObject(
            "SELECT COUNT(*) FROM site_grants WHERE site_id=? AND user_id=? AND permission_profile='SITE_MANAGER'", Long.class,
            siteId, context.userId()) == 0)
            throw new ApiException(HttpStatus.FORBIDDEN, "SITE_FORBIDDEN", "You cannot manage this site.");
    }
    private void audit(TenantContext context, String operation, String target, String summary) {
        jdbc.update("INSERT INTO audit_events(id,actor_id,corporation_id,operation,target,summary,occurred_at) VALUES (?,?,?,?,?,?,?)",
            UUID.randomUUID().toString(), context.userId(), context.corporationId(), operation, target, summary, Timestamp.from(Instant.now()));
    }
}
