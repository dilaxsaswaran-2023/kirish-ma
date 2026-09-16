package com.agrothulir.api;

import com.agrothulir.config.TenantContext;
import com.agrothulir.config.TenantContextInterceptor;
import com.agrothulir.service.DeviceIngestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1")
public class DeviceIngestController {
    private final DeviceIngestService ingest;
    public DeviceIngestController(DeviceIngestService ingest) { this.ingest = ingest; }
    private TenantContext context(HttpServletRequest request) { return (TenantContext) request.getAttribute(TenantContextInterceptor.ATTRIBUTE); }

    @PostMapping("/admin/devices/{deviceId}/credential")
    public Map<String, Object> credential(HttpServletRequest request, @PathVariable String deviceId) {
        return ingest.rotateCredential(context(request), deviceId);
    }
    @GetMapping("/device-ingest/{deviceId}/commands")
    public List<Map<String, Object>> commands(@PathVariable String deviceId, @RequestHeader("X-Device-Token") String token) {
        return ingest.pendingCommands(deviceId, token);
    }
    @PostMapping("/device-ingest/{deviceId}/feedback")
    public Map<String, Object> feedback(@PathVariable String deviceId, @RequestHeader("X-Device-Token") String token,
        @Valid @RequestBody FeedbackInput input) {
        return ingest.feedback(deviceId, token, input.componentId(), input.reportedState(), input.quality(), input.value(),
            input.unit(), input.commandId());
    }

    public record FeedbackInput(@NotBlank String componentId, @NotBlank String reportedState, @NotBlank String quality,
        String value, String unit, String commandId) {}
}
