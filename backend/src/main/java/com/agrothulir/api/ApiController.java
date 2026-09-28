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
    @GetMapping("/zones") public List<Map<String, Object>> zones(HttpServletRequest request) { return service.zones(context(request)); }
    @GetMapping("/zones/{zoneId}") public Map<String, Object> zone(HttpServletRequest request, @PathVariable String zoneId) { return service.zone(context(request), zoneId); }

    @GetMapping("/devices") public List<Map<String, Object>> devices(HttpServletRequest request, @RequestParam(required=false) String siteId,
        @RequestParam(required=false) String zoneId) { return service.devices(context(request), siteId, zoneId); }
    @GetMapping("/devices/{deviceId}") public Map<String, Object> device(HttpServletRequest request, @PathVariable String deviceId) { return service.device(context(request), deviceId); }
    @GetMapping("/devices/{deviceId}/capabilities") public Map<String, Object> capabilities(HttpServletRequest request, @PathVariable String deviceId) { return service.capabilities(context(request), deviceId); }
    @GetMapping("/devices/{deviceId}/components") public List<Map<String, Object>> components(HttpServletRequest request, @PathVariable String deviceId) { return service.components(context(request), deviceId); }
    @GetMapping("/devices/{deviceId}/diagnostics") public Map<String, Object> diagnostics(HttpServletRequest request, @PathVariable String deviceId) { return service.diagnostics(context(request), deviceId); }

    @GetMapping("/sites/{siteId}/topology") public Map<String, Object> topology(HttpServletRequest request, @PathVariable String siteId) { return service.topology(context(request), siteId); }

    @GetMapping("/flows") public List<Map<String, Object>> flows(HttpServletRequest request) { return service.flows(context(request)); }
    @PostMapping("/flows/{flowId}/validate") public Map<String, Object> validateFlow(HttpServletRequest request, @PathVariable String flowId) {
        return service.validateFlow(context(request), flowId);
    }
    @PostMapping("/flows/{flowId}/publish") public Map<String, Object> publishFlow(HttpServletRequest request, @PathVariable String flowId) { return service.publishFlow(context(request), flowId); }

    @GetMapping("/schedules") public List<Map<String, Object>> schedules(HttpServletRequest request) { return service.schedules(context(request)); }
    @PatchMapping("/schedules/{scheduleId}") public Map<String, Object> updateSchedule(HttpServletRequest request, @PathVariable String scheduleId, @RequestBody SchedulePatch patch) { return service.pauseSchedule(context(request), scheduleId, patch.enabled()); }
    @PostMapping("/schedules/{scheduleId}/pause") public Map<String, Object> pauseSchedule(HttpServletRequest request, @PathVariable String scheduleId) { return service.pauseSchedule(context(request), scheduleId, false); }
    @PostMapping("/schedules/{scheduleId}/preview") public Map<String, Object> preview(HttpServletRequest request, @PathVariable String scheduleId) { return service.schedulePreview(context(request), scheduleId); }

    @GetMapping("/alerts") public List<Map<String, Object>> alerts(HttpServletRequest request) { return service.alerts(context(request)); }
    @PostMapping("/alerts/{alertId}/acknowledgements") public Map<String, Object> acknowledge(HttpServletRequest request, @PathVariable String alertId) { return service.acknowledgeAlert(context(request), alertId); }
    @GetMapping("/audit-events") public List<Map<String, Object>> audit(HttpServletRequest request) { return service.audit(context(request)); }

    @GetMapping("/commands/{commandId}") public Map<String, Object> command(HttpServletRequest request, @PathVariable String commandId) { return service.command(context(request), commandId); }
    @GetMapping("/runs/{runId}") public Map<String, Object> run(HttpServletRequest request, @PathVariable String runId) { return service.run(context(request), runId); }
    @GetMapping("/runs/{runId}/events") public List<Map<String, Object>> runEvents(HttpServletRequest request, @PathVariable String runId) {
        Map<String, Object> run = service.run(context(request), runId);
        if (run.get("ended_at") == null) return List.of(Map.of("sequence", 1, "state", run.get("state"), "at", run.get("started_at")));
        return List.of(Map.of("sequence", 1, "state", "ACCEPTED", "at", run.get("started_at")),
            Map.of("sequence", 2, "state", run.get("state"), "at", run.get("ended_at")));
    }

    private TenantContext context(HttpServletRequest request) { return (TenantContext) request.getAttribute(TenantContextInterceptor.ATTRIBUTE); }
    public record CorporationRequest(@NotBlank String name, @NotBlank String workspaceCode, @NotBlank String defaultTimezone) {}
    public record SchedulePatch(boolean enabled) {}
}
