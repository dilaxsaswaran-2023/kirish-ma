package com.agrothulir.api;

import com.agrothulir.config.TenantContext;
import com.agrothulir.config.TenantContextInterceptor;
import com.agrothulir.service.OperationalFlowService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1")
public class OperationalFlowController {
    private final OperationalFlowService flows;
    public OperationalFlowController(OperationalFlowService flows) { this.flows = flows; }
    private TenantContext context(HttpServletRequest request) { return (TenantContext) request.getAttribute(TenantContextInterceptor.ATTRIBUTE); }

    @GetMapping("/sites/{siteId}/operational-flows")
    public List<Map<String, Object>> flows(HttpServletRequest request, @PathVariable String siteId) { return flows.flows(context(request), siteId); }
    @GetMapping("/operational-flows/{flowId}")
    public Map<String, Object> flow(HttpServletRequest request, @PathVariable String flowId) { return flows.flow(context(request), flowId); }
    @GetMapping("/sites/{siteId}/components")
    public List<Map<String, Object>> components(HttpServletRequest request, @PathVariable String siteId) { return flows.siteComponents(context(request), siteId); }
    @GetMapping("/sites/{siteId}/history")
    public List<Map<String, Object>> history(HttpServletRequest request, @PathVariable String siteId) { return flows.history(context(request), siteId); }
    @GetMapping("/sites/{siteId}/readings")
    public List<Map<String, Object>> readings(HttpServletRequest request, @PathVariable String siteId) { return flows.readings(context(request), siteId); }
    @GetMapping("/sites/{siteId}/schedules")
    public List<Map<String, Object>> schedules(HttpServletRequest request, @PathVariable String siteId) { return flows.schedules(context(request), siteId); }
    @GetMapping("/sites/{siteId}/alerts")
    public List<Map<String, Object>> alerts(HttpServletRequest request, @PathVariable String siteId) { return flows.alerts(context(request), siteId); }
    @GetMapping("/operational-runs/{runId}")
    public Map<String, Object> run(HttpServletRequest request, @PathVariable String runId) { return flows.run(context(request), runId); }

    @PostMapping("/admin/sites/{siteId}/operational-flows")
    public ResponseEntity<Map<String, Object>> create(HttpServletRequest request, @PathVariable String siteId, @Valid @RequestBody FlowInput input) {
        Map<String, Object> created = flows.createFlow(context(request), siteId, input.name(), input.componentIds());
        return ResponseEntity.created(URI.create("/v1/operational-flows/" + created.get("id"))).body(created);
    }
    @PutMapping("/admin/operational-flows/{flowId}")
    public Map<String, Object> update(HttpServletRequest request, @PathVariable String flowId, @Valid @RequestBody FlowInput input) {
        return flows.updateFlow(context(request), flowId, input.name(), input.componentIds());
    }
    @PostMapping("/operational-flows/{flowId}/actions")
    public ResponseEntity<Map<String, Object>> action(HttpServletRequest request, @PathVariable String flowId,
        @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody ActionInput input) {
        Map<String, Object> run = flows.action(context(request), flowId, input.action().toUpperCase(), key);
        return ResponseEntity.accepted().location(URI.create("/v1/operational-runs/" + run.get("id"))).body(run);
    }

    public record FlowInput(@NotBlank String name, @NotEmpty List<@NotBlank String> componentIds) {}
    public record ActionInput(@NotBlank String action) {}
}
