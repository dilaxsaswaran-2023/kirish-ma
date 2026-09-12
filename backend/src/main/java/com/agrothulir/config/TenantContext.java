package com.agrothulir.config;

public record TenantContext(String userId, String corporationId, Role role) {
    public enum Role { SUPER_ADMIN, CORPORATE_ADMIN, SITE_MANAGER, OPERATOR, VIEWER }

    public boolean canControl() { return role != Role.VIEWER; }
    public boolean canManage() { return role == Role.SUPER_ADMIN || role == Role.CORPORATE_ADMIN || role == Role.SITE_MANAGER; }
    public boolean isPlatformAdmin() { return role == Role.SUPER_ADMIN; }
}
