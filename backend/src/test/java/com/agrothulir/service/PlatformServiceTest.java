package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.agrothulir.config.TenantContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = "spring.task.scheduling.enabled=false")
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
        jdbc.update("UPDATE components SET reported_state='STOPPED',feedback_quality='CONFIRMED' WHERE id='pump-01'");
        jdbc.update("UPDATE components SET reported_state='CLOSED',feedback_quality='CONFIRMED' WHERE id='valve-a'");
    }

    private TenantContext operator() { return new TenantContext("user-anjali", "corp-greenroot", TenantContext.Role.OPERATOR); }

    @Test
    void tenantCannotReadAnotherTenantsDevice() {
        TenantContext otherTenant = new TenantContext("user-platform", "corp-coastal", TenantContext.Role.CORPORATE_ADMIN);
        assertThatThrownBy(() -> service.device(otherTenant, "device-controller-01"))
            .isInstanceOf(ApiException.class).hasMessageContaining("not found");
    }

    @Test
    void viewerCannotIssueCommand() {
        TenantContext viewer = new TenantContext("user-anjali", "corp-greenroot", TenantContext.Role.VIEWER);
        assertThatThrownBy(() -> service.command(viewer, "pump-01", "viewer-attempt", new PlatformService.CommandRequest("START", 60)))
            .isInstanceOf(ApiException.class).hasMessageContaining("View-only");
    }

    @Test
    void duplicateIntentReturnsSameCommandIdentity() {
        var first = service.command(operator(), "pump-01", "same-key", new PlatformService.CommandRequest("START", 60));
        var duplicate = service.command(operator(), "pump-01", "same-key", new PlatformService.CommandRequest("START", 60));
        assertThat(duplicate.commandId()).isEqualTo(first.commandId());
        assertThat(duplicate.runId()).isEqualTo(first.runId());
    }

    @Test
    void secondStartCannotTakeHeldResources() {
        service.command(operator(), "pump-01", "first-owner", new PlatformService.CommandRequest("START", 60));
        assertThatThrownBy(() -> service.command(operator(), "pump-01", "second-owner", new PlatformService.CommandRequest("START", 60)))
            .isInstanceOf(ApiException.class).hasMessageContaining("owned by another run");
    }
}
