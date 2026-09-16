package com.agrothulir.service;

import com.agrothulir.api.ApiException;
import com.agrothulir.config.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {
    private final JdbcTemplate jdbc;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public AuthService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional
    public Map<String, Object> login(String email, String password) {
        List<Map<String, Object>> users = jdbc.queryForList(
            "SELECT id,display_name,password_hash FROM users WHERE LOWER(email)=LOWER(?) AND account_status='ACTIVE'", email.trim());
        if (users.size() != 1 || users.get(0).get("password_hash") == null ||
            !passwords.matches(password, (String) users.get(0).get("password_hash"))) invalidCredentials();
        String userId = users.get(0).get("id").toString();
        List<Map<String, Object>> memberships = jdbc.queryForList(
            "SELECT m.corporation_id,m.corporate_role FROM corporation_memberships m JOIN corporations c ON c.id=m.corporation_id " +
            "WHERE m.user_id=? AND m.status='ACTIVE' AND c.status='ACTIVE' ORDER BY c.name,m.corporation_id", userId);
        if (memberships.isEmpty()) invalidCredentials();
        String corporationId = memberships.get(0).get("corporation_id").toString();
        String token = newToken();
        Instant expires = Instant.now().plus(7, ChronoUnit.DAYS);
        jdbc.update("INSERT INTO auth_sessions(token_hash,user_id,corporation_id,expires_at) VALUES (?,?,?,?)",
            hash(token), userId, corporationId, Timestamp.from(expires));
        String role = memberships.get(0).get("corporate_role").toString();
        return Map.of("token", token, "expiresAt", expires.toString(), "userId", userId,
            "corporationId", corporationId, "role", role,
            "displayName", users.get(0).get("display_name"));
    }

    public TenantContext authenticate(String token) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT s.user_id,s.corporation_id,m.corporate_role FROM auth_sessions s " +
            "JOIN users u ON u.id=s.user_id AND u.account_status='ACTIVE' " +
            "JOIN corporation_memberships m ON m.user_id=s.user_id AND m.corporation_id=s.corporation_id AND m.status='ACTIVE' " +
            "WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP", hash(token));
        if (rows.size() != 1) throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "Sign in again.");
        Map<String, Object> row = rows.get(0);
        String role = (String) row.get("corporate_role");
        if (!role.equals("SUPER_ADMIN") && !role.equals("CORPORATE_ADMIN")) {
            List<String> grants = jdbc.queryForList(
                "SELECT permission_profile FROM site_grants WHERE user_id=? AND corporation_id=?",
                String.class, row.get("user_id"), row.get("corporation_id"));
            if (grants.contains("SITE_MANAGER")) role = "SITE_MANAGER";
            else if (grants.contains("OPERATOR")) role = "OPERATOR";
            else role = "VIEWER";
        }
        return new TenantContext(row.get("user_id").toString(), row.get("corporation_id").toString(), TenantContext.Role.valueOf(role));
    }

    @Transactional
    public void logout(String token) { jdbc.update("DELETE FROM auth_sessions WHERE token_hash=?", hash(token)); }

    @Transactional
    public Map<String, Object> switchCorporation(String token, String corporationId) {
        TenantContext context = authenticate(token);
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM corporations WHERE id=?", Long.class, corporationId);
        if (count == null || count == 0) throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Corporation was not found.");
        Long memberships = jdbc.queryForObject("SELECT COUNT(*) FROM corporation_memberships WHERE corporation_id=? AND user_id=? AND status='ACTIVE'", Long.class,
            corporationId, context.userId());
        if (memberships == null || memberships == 0) {
            if (!context.isPlatformAdmin()) throw new ApiException(HttpStatus.FORBIDDEN, "CORPORATION_ACCESS_DENIED", "This corporation is not assigned to your account.");
            jdbc.update("INSERT INTO corporation_memberships VALUES (?,?,'SUPER_ADMIN','ACTIVE')", corporationId, context.userId());
        }
        jdbc.update("UPDATE auth_sessions SET corporation_id=? WHERE token_hash=?", corporationId, hash(token));
        return Map.of("corporationId", corporationId, "role", authenticate(token).role().name());
    }

    private String newToken() {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception ex) { throw new IllegalStateException(ex); }
    }

    private void invalidCredentials() {
        throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    public String encodePassword(String password) { return passwords.encode(password); }
}
