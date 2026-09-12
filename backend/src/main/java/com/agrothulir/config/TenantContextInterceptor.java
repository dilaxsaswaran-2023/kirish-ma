package com.agrothulir.config;

import com.agrothulir.api.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantContextInterceptor implements HandlerInterceptor {
    public static final String ATTRIBUTE = TenantContext.class.getName();
    private final boolean demoAuth;

    public TenantContextInterceptor(@Value("${agrothulir.demo-auth:false}") boolean demoAuth) { this.demoAuth = demoAuth; }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (request.getRequestURI().startsWith("/actuator/") || request.getRequestURI().startsWith("/h2-console")) return true;
        String user = request.getHeader("X-User-Id");
        String corporation = request.getHeader("X-Corporation-Id");
        String role = request.getHeader("X-Role");
        if (demoAuth) {
            user = blank(user) ? "user-anjali" : user;
            corporation = blank(corporation) ? "corp-greenroot" : corporation;
            role = blank(role) ? "OPERATOR" : role;
        }
        if (blank(user) || blank(corporation) || blank(role)) throw new ApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "A verified identity and workspace context are required.");
        try {
            request.setAttribute(ATTRIBUTE, new TenantContext(user, corporation, TenantContext.Role.valueOf(role)));
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "The supplied role is not recognised.");
        }
        return true;
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }
}
