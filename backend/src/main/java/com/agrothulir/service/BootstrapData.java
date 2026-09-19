package com.agrothulir.service;

import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Configuration
public class BootstrapData {
    @Bean ApplicationRunner bootstrapRunner(BootstrapSeeder seeder) { return args -> seeder.seed(); }

    @org.springframework.stereotype.Component
    public static class BootstrapSeeder {
        private final JdbcTemplate jdbc;
        private final AuthService auth;
        private final String initialPassword;
        public BootstrapSeeder(JdbcTemplate jdbc, AuthService auth,
            @Value("${agrothulir.bootstrap-password}") String initialPassword) {
            this.jdbc = jdbc;
            this.auth = auth;
            this.initialPassword = initialPassword;
        }

        @Transactional
        public void seed() {
            String corporation = corporation();
            String superAdmin = user("superadmin@gmail.com", "Super Admin");
            String corpAdmin = user("kirish@gmail.com", "Kirish Corp Admin");
            String manager = user("sitemanager@kirish.com", "Kirish Site Manager");
            String operator = user("operator@kirish.com", "Kirish Operator");
            member(corporation, superAdmin, "SUPER_ADMIN");
            member(corporation, corpAdmin, "CORPORATE_ADMIN");
            member(corporation, manager, "MEMBER");
            member(corporation, operator, "MEMBER");

            String farm = site(corporation, "Kirish Farm", "FARM", "Kilinochchi");
            String greenhouse = site(corporation, "Kirish Greenhouse", "GREENHOUSE", "Vavuniya");
            String zone = zone(corporation, farm, "Controller Zone A");
            grant(corporation, farm, manager, "SITE_MANAGER");
            grant(corporation, greenhouse, manager, "SITE_MANAGER");
            grant(corporation, farm, operator, "OPERATOR");

            String controller = device(corporation, farm, zone, "KIR-AT8X-001", "Farm Controller", "AT-8X");
            String climate = device(corporation, greenhouse, null, "KIR-CLIMA-001", "Greenhouse Climate Station", "AT-CLIMA");
            String valve = component(corporation, farm, controller, "VALVE", "Isolation Valve", "DO1 / DI1");
            String motor = component(corporation, farm, controller, "PUMP", "Farm Motor", "DO2 / DI2");
            component(corporation, farm, controller, "SENSOR", "Soil Moisture", "AI1");
            component(corporation, greenhouse, climate, "SENSOR", "Air Temperature", "AI1");
            String flow = flow(corporation, farm);
            flowSteps(corporation, farm, flow, valve, motor);
            schedule(corporation, farm, flow);
        }

        private String corporation() {
            List<String> rows = jdbc.queryForList("SELECT id FROM corporations WHERE UPPER(workspace_code)='KIRISH'", String.class);
            if (!rows.isEmpty()) return rows.get(0);
            String id = newId();
            jdbc.update("INSERT INTO corporations(id,workspace_code,name,status,default_timezone) VALUES (?,'KIRISH','Kirish Corp','ACTIVE','Asia/Colombo')", id);
            return id;
        }

        private String user(String email, String name) {
            List<String> rows = jdbc.queryForList("SELECT id FROM users WHERE LOWER(email)=LOWER(?)", String.class, email);
            if (!rows.isEmpty()) {
                String id = rows.get(0);
                if (jdbc.queryForObject("SELECT password_hash FROM users WHERE id=?", String.class, id) == null)
                    jdbc.update("UPDATE users SET password_hash=? WHERE id=? AND password_hash IS NULL", auth.encodePassword(initialPassword), id);
                return id;
            }
            String id = newId();
            jdbc.update("INSERT INTO users(id,identity_subject,display_name,account_status,email,password_hash) VALUES (?,?,?,'ACTIVE',?,?)",
                id, "local|" + email, name, email, auth.encodePassword(initialPassword));
            return id;
        }

        private void member(String corporation, String user, String role) {
            if (count("SELECT COUNT(*) FROM corporation_memberships WHERE corporation_id=? AND user_id=?", corporation, user) == 0)
                jdbc.update("INSERT INTO corporation_memberships VALUES (?,?,?,'ACTIVE')", corporation, user, role);
        }

        private String site(String corporation, String name, String type, String location) {
            List<String> rows = jdbc.queryForList("SELECT id FROM sites WHERE corporation_id=? AND LOWER(name)=LOWER(?)", String.class, corporation, name);
            if (!rows.isEmpty()) return rows.get(0);
            String id = newId();
            jdbc.update("INSERT INTO sites(id,corporation_id,name,type,location,timezone,health) VALUES (?,?,?,?,?,'Asia/Colombo','OFFLINE')",
                id, corporation, name, type, location);
            return id;
        }

        private String zone(String corporation, String site, String name) {
            List<String> rows = jdbc.queryForList("SELECT id FROM zones WHERE corporation_id=? AND site_id=? AND LOWER(name)=LOWER(?)",
                String.class, corporation, site, name);
            if (!rows.isEmpty()) return rows.get(0);
            String id = newId();
            jdbc.update("INSERT INTO zones(id,corporation_id,site_id,name) VALUES (?,?,?,?)", id, corporation, site, name);
            return id;
        }

        private void grant(String corporation, String site, String user, String role) {
            if (count("SELECT COUNT(*) FROM site_grants WHERE site_id=? AND user_id=?", site, user) == 0)
                jdbc.update("INSERT INTO site_grants VALUES (?,?,?,?)", corporation, site, user, role);
        }

        private String device(String corporation, String site, String zone, String serial, String name, String model) {
            List<String> rows = jdbc.queryForList("SELECT id FROM devices WHERE corporation_id=? AND site_id=? AND LOWER(name)=LOWER(?)",
                String.class, corporation, site, name);
            if (!rows.isEmpty()) return rows.get(0);
            String id = newId();
            String availableSerial = count("SELECT COUNT(*) FROM devices WHERE serial=?", serial) == 0 ? serial : serial + "-" + UUID.randomUUID();
            jdbc.update("INSERT INTO devices(id,corporation_id,site_id,zone_id,serial,name,model,status) VALUES (?,?,?,?,?,?,?,'OFFLINE')",
                id, corporation, site, zone, availableSerial, name, model);
            return id;
        }

        private String component(String corporation, String site, String device, String kind, String name, String channel) {
            List<String> rows = jdbc.queryForList("SELECT id FROM components WHERE corporation_id=? AND device_id=? AND kind=? AND hardware_channel=?",
                String.class, corporation, device, kind, channel);
            if (!rows.isEmpty()) return rows.get(0);
            String id = newId();
            jdbc.update("INSERT INTO components(id,corporation_id,site_id,device_id,kind,name,hardware_channel,feedback_quality) VALUES (?,?,?,?,?,?,?,'UNKNOWN')",
                id, corporation, site, device, kind, name, channel);
            return id;
        }

        private String flow(String corporation, String site) {
            List<String> rows = jdbc.queryForList("SELECT id FROM flows WHERE corporation_id=? AND site_id=? AND LOWER(name)='farm motor'",
                String.class, corporation, site);
            if (!rows.isEmpty()) return rows.get(0);
            String id = newId();
            jdbc.update("INSERT INTO flows(id,corporation_id,site_id,name,status,published_version,graph,shutdown_policy) VALUES (?,?,?,'Farm Motor','PUBLISHED',1,'{}','{}')",
                id, corporation, site);
            return id;
        }

        private void flowSteps(String corporation, String site, String flow, String valve, String motor) {
            if (count("SELECT COUNT(*) FROM flow_steps WHERE flow_id=?", flow) > 0) return;
            jdbc.update("INSERT INTO flow_steps(id,corporation_id,site_id,flow_id,component_id,step_index,on_action,off_action) VALUES (?,?,?,?,?,1,'OPEN','CLOSE')",
                UUID.randomUUID().toString(), corporation, site, flow, valve);
            jdbc.update("INSERT INTO flow_steps(id,corporation_id,site_id,flow_id,component_id,step_index,on_action,off_action) VALUES (?,?,?,?,?,2,'START','STOP')",
                UUID.randomUUID().toString(), corporation, site, flow, motor);
        }

        private void schedule(String corporation, String site, String flow) {
            if (count("SELECT COUNT(*) FROM schedules WHERE corporation_id=? AND site_id=? AND LOWER(name)='weekday motor start'",
                corporation, site) > 0) return;
            String id = newId();
            jdbc.update("INSERT INTO schedules(id,corporation_id,site_id,target_flow_id,flow_version,name,timezone,recurrence,missed_policy,enabled) " +
                "VALUES (?,?,?,?,1,'Weekday Motor Start','Asia/Colombo','MON-FRI 06:00','SKIP',FALSE)", id, corporation, site, flow);
        }

        private String newId() { return UUID.randomUUID().toString(); }
        private long count(String sql, Object... args) { Long value = jdbc.queryForObject(sql, Long.class, args); return value == null ? 0 : value; }
    }
}
