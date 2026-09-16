package com.agrothulir.api;

import com.agrothulir.config.TenantContext;
import com.agrothulir.config.TenantContextInterceptor;
import com.agrothulir.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/admin")
public class AdminController {
    private final AdminService admin;
    public AdminController(AdminService admin) { this.admin = admin; }
    private TenantContext context(HttpServletRequest request) { return (TenantContext) request.getAttribute(TenantContextInterceptor.ATTRIBUTE); }

    @GetMapping("/users") public List<Map<String, Object>> users(HttpServletRequest request) { return admin.users(context(request)); }
    @PostMapping("/users") public Map<String, Object> user(HttpServletRequest request, @Valid @RequestBody UserInput input) {
        return admin.createUser(context(request), input.email(), input.displayName(), input.password(), input.role(), input.siteId());
    }
    @PostMapping("/sites") public Map<String, Object> site(HttpServletRequest request, @Valid @RequestBody SiteInput input) {
        return admin.createSite(context(request), input.name(), input.type(), input.location());
    }
    @PostMapping("/devices") public Map<String, Object> device(HttpServletRequest request, @Valid @RequestBody DeviceInput input) {
        return admin.createDevice(context(request), input.siteId(), input.serial(), input.name(), input.model());
    }
    @PostMapping("/devices/{deviceId}/components") public Map<String, Object> component(HttpServletRequest request,
        @PathVariable String deviceId, @Valid @RequestBody ComponentInput input) {
        return admin.createComponent(context(request), deviceId, input.kind().toUpperCase(), input.name(), input.hardwareChannel());
    }

    public record UserInput(@NotBlank @Email String email, @NotBlank String displayName,
        @NotBlank @Size(min=8) String password, @NotBlank String role, String siteId) {}
    public record SiteInput(@NotBlank String name, @NotBlank String type, @NotBlank String location) {}
    public record DeviceInput(@NotBlank String siteId, @NotBlank String serial, @NotBlank String name, @NotBlank String model) {}
    public record ComponentInput(@NotBlank String kind, @NotBlank String name, @NotBlank String hardwareChannel) {}
}
