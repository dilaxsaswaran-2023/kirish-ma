package com.agrothulir.api;

import com.agrothulir.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }

    @PostMapping("/login") public Map<String, Object> login(@Valid @RequestBody LoginRequest input) {
        return auth.login(input.email(), input.password());
    }
    @PostMapping("/logout") public Map<String, Boolean> logout(HttpServletRequest request) {
        auth.logout(request.getHeader("Authorization").substring(7));
        return Map.of("signedOut", true);
    }
    @PostMapping("/context") public Map<String, Object> context(HttpServletRequest request, @Valid @RequestBody ContextRequest input) {
        return auth.switchCorporation(request.getHeader("Authorization").substring(7), input.corporationId());
    }
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record ContextRequest(@NotBlank String corporationId) {}
}
