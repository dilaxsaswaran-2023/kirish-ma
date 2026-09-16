package com.agrothulir.config;

import com.agrothulir.api.ApiException;
import com.agrothulir.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantContextInterceptor implements HandlerInterceptor {
    public static final String ATTRIBUTE = TenantContext.class.getName();
    private final AuthService auth;

    public TenantContextInterceptor(AuthService auth) { this.auth = auth; }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (request.getMethod().equals("OPTIONS") || request.getRequestURI().equals("/v1/auth/login") ||
            request.getRequestURI().startsWith("/v1/device-ingest/") ||
            request.getRequestURI().startsWith("/actuator/")) return true;
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer "))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Sign in to access this service.");
        request.setAttribute(ATTRIBUTE, auth.authenticate(authorization.substring(7)));
        return true;
    }
}
