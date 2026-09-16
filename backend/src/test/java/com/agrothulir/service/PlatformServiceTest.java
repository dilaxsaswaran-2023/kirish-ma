package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.agrothulir.config.TenantContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {"spring.task.scheduling.enabled=false", "spring.datasource.url=jdbc:h2:mem:agrothulir-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "spring.datasource.username=sa", "spring.datasource.password="})
class PlatformServiceTest {
    @Autowired PlatformService service;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void clearCommandState() {
        jdbc.update("DELETE FROM outbox_events");
        jdbc.update("DELETE FROM resource_reservations");
        jdbc.update("DELETE FROM commands");
        jdbc.update("DELETE FROM runs");
        jdbc.update("DELETE FROM audit_events");
        jdbc.update("UPDATE devices SET status='ONLINE' WHERE serial='KIR-AT8X-001'");
        jdbc.update("UPDATE components SET reported_state='STOPPED',feedback_quality='CONFIRMED' WHERE hardware_channel='DO2 / DI2'");
        jdbc.update("UPDATE components SET reported_state='CLOSED',feedback_quality='CONFIRMED' WHERE hardware_channel='DO1 / DI1'");
    }

    private String corporation() { return jdbc.queryForObject("SELECT id FROM corporations WHERE workspace_code='KIRISH'", String.class); }
    private String operatorId() { return jdbc.queryForObject("SELECT id FROM users WHERE email='operator@kirish.com'", String.class); }
    private String component(String channel) { return jdbc.queryForObject("SELECT id FROM components WHERE hardware_channel=?", String.class, channel); }
    private TenantContext operator() { return new TenantContext(operatorId(), corporation(), TenantContext.Role.OPERATOR); }

    @Test
    void tenantCannotReadAnotherTenantsDevice() {
        TenantContext otherTenant = new TenantContext(UUID.randomUUID().toString(), UUID.randomUUID().toString(), TenantContext.Role.CORPORATE_ADMIN);
        String deviceId = jdbc.queryForObject("SELECT id FROM devices WHERE serial='KIR-AT8X-001'", String.class);
        assertThatThrownBy(() -> service.device(otherTenant, deviceId))
            .isInstanceOf(ApiException.class).hasMessageContaining("not found");
    }

    @Test
    void viewerCannotIssueCommand() {
        TenantContext viewer = new TenantContext(operatorId(), corporation(), TenantContext.Role.VIEWER);
        assertThatThrownBy(() -> service.command(viewer, component("DO2 / DI2"), "viewer-attempt", new PlatformService.CommandRequest("START", 60)))
            .isInstanceOf(ApiException.class).hasMessageContaining("View-only");
    }

    @Test
    void duplicateIntentReturnsSameCommandIdentity() {
        var first = service.command(operator(), component("DO2 / DI2"), "same-key", new PlatformService.CommandRequest("START", 60));
        var duplicate = service.command(operator(), component("DO2 / DI2"), "same-key", new PlatformService.CommandRequest("START", 60));
        assertThat(duplicate.commandId()).isEqualTo(first.commandId());
        assertThat(duplicate.runId()).isEqualTo(first.runId());
    }

    @Test
    void secondStartCannotTakeHeldResources() {
        service.command(operator(), component("DO2 / DI2"), "first-owner", new PlatformService.CommandRequest("START", 60));
        assertThatThrownBy(() -> service.command(operator(), component("DO2 / DI2"), "second-owner", new PlatformService.CommandRequest("START", 60)))
            .isInstanceOf(ApiException.class).hasMessageContaining("owned by another run");
    }
}
