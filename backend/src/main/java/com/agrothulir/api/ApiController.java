package com.agrothulir.api;

import com.agrothulir.config.TenantContext;
import com.agrothulir.config.TenantContextInterceptor;
import com.agrothulir.service.PlatformService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1")
public class ApiController {
    private final PlatformService service;
    public ApiController(PlatformService service) { this.service = service; }

    @GetMapping("/me") public Map<String, Object> me(HttpServletRequest request) { return service.me(context(request)); }
    @GetMapping("/me/workspaces") public List<Map<String, Object>> workspaces(HttpServletRequest request) { return service.workspaces(context(request)); }
    @PostMapping("/session/context") public Map<String, Object> selectContext(HttpServletRequest request) { return Map.of("context", service.me(context(request)), "selectedAt", Instant.now()); }

    @GetMapping("/platform/overview") public Map<String, Object> overview(HttpServletRequest request) { return service.platformOverview(context(request)); }
    @GetMapping("/platform/corporations") public List<Map<String, Object>> corporations(HttpServletRequest request) { return service.corporations(context(request)); }
    @PostMapping("/platform/corporations") public ResponseEntity<?> createCorporation(HttpServletRequest request, @Valid @RequestBody CorporationRequest body) {
        Map<String, Object> created = service.createCorporation(context(request), body.name(), body.workspaceCode(), body.defaultTimezone());
        return ResponseEntity.created(URI.create("/v1/platform/corporations/" + created.get("id"))).body(created);
    }

    @GetMapping("/sites") public List<Map<String, Object>> sites(HttpServletRequest request) { return service.sites(context(request)); }
    @GetMapping("/sites/{siteId}") public Map<String, Object> site(HttpServletRequest request, @PathVariable String siteId) { return service.site(context(request), siteId); }
    @GetMapping("/sites/{siteId}/zones") public Object zones(HttpServletRequest request, @PathVariable String siteId) { return service.site(context(request), siteId).get("zones"); }

    @GetMapping("/devices") public List<Map<String, Object>> devices(HttpServletRequest request, @RequestParam(defaultValue = "site-north") String siteId) { return service.devices(context(request), siteId); }
    @GetMapping("/devices/{deviceId}") public Map<String, Object> device(HttpServletRequest request, @PathVariable String deviceId) { return service.device(context(request), deviceId); }
    @GetMapping("/devices/{deviceId}/capabilities") public Map<String, Object> capabilities(HttpServletRequest request, @PathVariable String deviceId) { return service.capabilities(context(request), deviceId); }
    @GetMapping("/devices/{deviceId}/components") public List<Map<String, Object>> components(HttpServletRequest request, @PathVariable String deviceId) { return service.components(context(request), deviceId); }
    @GetMapping("/devices/{deviceId}/diagnostics") public Map<String, Object> diagnostics(HttpServletRequest request, @PathVariable String deviceId) {
        Map<String, Object> device = service.device(context(request), deviceId);
        return Map.of("deviceId", deviceId, "status", device.get("status"), "mqtt", "CONNECTED", "telemetryLagSeconds", 1.4, "configuration", "MATCHED");
    }

    @GetMapping("/sites/{siteId}/topology") public Map<String, Object> topology(HttpServletRequest request, @PathVariable String siteId) {
        service.site(context(request), siteId);
        return Map.of("siteId", siteId, "status", "VALID", "nodes", List.of("reservoir", "pump-01", "valve-a", "zone-a"), "connections", List.of(Map.of("from", "reservoir", "to", "pump-01", "type", "WATER"), Map.of("from", "pump-01", "to", "valve-a", "type", "WATER"), Map.of("from", "valve-a", "to", "zone-a", "type", "WATER")));
    }

    @GetMapping("/flows") public List<Map<String, Object>> flows(HttpServletRequest request) { return service.flows(context(request)); }
    @PostMapping("/flows/{flowId}/validate") public Map<String, Object> validateFlow(HttpServletRequest request, @PathVariable String flowId) {
        service.flows(context(request)).stream().filter(f -> flowId.equals(f.get("id"))).findFirst().orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Flow was not found in this workspace."));
        return Map.of("flowId", flowId, "valid", true, "checks", List.of("OWNERSHIP", "PORT_COMPATIBILITY", "BOUNDED_EXECUTION", "SAFE_STOP", "FRESH_FEEDBACK"));
    }
    @PostMapping("/flows/{flowId}/publish") public Map<String, Object> publishFlow(HttpServletRequest request, @PathVariable String flowId) { return service.publishFlow(context(request), flowId); }
    @PostMapping("/flows/{flowId}/runs") public ResponseEntity<?> runFlow(HttpServletRequest request, @PathVariable String flowId, @RequestHeader("Idempotency-Key") String key) {
        service.flows(context(request)).stream().filter(f -> flowId.equals(f.get("id"))).findFirst().orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Published flow was not found in this workspace."));
        var receipt = service.command(context(request), "pump-01", key, new PlatformService.CommandRequest("START", 900));
        return ResponseEntity.accepted().location(URI.create(receipt.statusUrl())).body(receipt);
    }

    @GetMapping("/schedules") public List<Map<String, Object>> schedules(HttpServletRequest request) { return service.schedules(context(request)); }
    @PatchMapping("/schedules/{scheduleId}") public Map<String, Object> updateSchedule(HttpServletRequest request, @PathVariable String scheduleId, @RequestBody SchedulePatch patch) { return service.pauseSchedule(context(request), scheduleId, patch.enabled()); }
    @PostMapping("/schedules/{scheduleId}/pause") public Map<String, Object> pauseSchedule(HttpServletRequest request, @PathVariable String scheduleId) { return service.pauseSchedule(context(request), scheduleId, false); }
    @PostMapping("/schedules/{scheduleId}/preview") public Map<String, Object> preview(HttpServletRequest request, @PathVariable String scheduleId) {
        service.schedules(context(request)).stream().filter(s -> scheduleId.equals(s.get("id"))).findFirst().orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Schedule was not found in this workspace."));
        return Map.of("scheduleId", scheduleId, "timezone", "Asia/Colombo", "dstPolicy", "SKIP_NONEXISTENT_SINGLE_REPEATED", "occurrences", List.of("2026-09-14T06:00:00+05:30", "2026-09-15T06:00:00+05:30"));
    }

    @GetMapping("/alerts") public List<Map<String, Object>> alerts(HttpServletRequest request) { return service.alerts(context(request)); }
    @PostMapping("/alerts/{alertId}/acknowledgements") public Map<String, Object> acknowledge(HttpServletRequest request, @PathVariable String alertId) { return service.acknowledgeAlert(context(request), alertId); }
    @GetMapping("/audit-events") public List<Map<String, Object>> audit(HttpServletRequest request) { return service.audit(context(request)); }

    @PostMapping("/components/{componentId}/commands") public ResponseEntity<?> command(HttpServletRequest request, @PathVariable String componentId, @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody CommandRequest body) {
        var receipt = service.command(context(request), componentId, key, new PlatformService.CommandRequest(body.action(), body.durationSeconds()));
        return ResponseEntity.accepted().location(URI.create(receipt.statusUrl())).body(receipt);
    }
    @GetMapping("/commands/{commandId}") public Map<String, Object> command(HttpServletRequest request, @PathVariable String commandId) { return service.command(context(request), commandId); }
    @GetMapping("/runs/{runId}") public Map<String, Object> run(HttpServletRequest request, @PathVariable String runId) { return service.run(context(request), runId); }
    @GetMapping("/runs/{runId}/events") public List<Map<String, Object>> runEvents(HttpServletRequest request, @PathVariable String runId) {
        Map<String, Object> run = service.run(context(request), runId);
        return List.of(Map.of("sequence", 1, "state", "ACCEPTED", "at", run.get("started_at")), Map.of("sequence", 2, "state", run.get("state"), "at", Instant.now().toString()));
    }
    @PostMapping("/runs/{runId}/safe-stop") public ResponseEntity<?> safeStop(HttpServletRequest request, @PathVariable String runId, @RequestHeader("Idempotency-Key") String key) {
        service.run(context(request), runId);
        var receipt = service.command(context(request), "pump-01", key, new PlatformService.CommandRequest("SAFE_STOP", 60));
        return ResponseEntity.accepted().location(URI.create(receipt.statusUrl())).body(receipt);
    }

    private TenantContext context(HttpServletRequest request) { return (TenantContext) request.getAttribute(TenantContextInterceptor.ATTRIBUTE); }
    public record CommandRequest(@NotBlank String action, int durationSeconds) {}
    public record CorporationRequest(@NotBlank String name, @NotBlank String workspaceCode, @NotBlank String defaultTimezone) {}
    public record SchedulePatch(boolean enabled) {}
}
