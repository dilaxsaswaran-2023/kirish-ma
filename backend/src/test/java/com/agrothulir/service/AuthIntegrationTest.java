package com.agrothulir.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:agrothulir-auth-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "spring.datasource.username=sa", "spring.datasource.password="})
@AutoConfigureMockMvc
class AuthIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired BootstrapData.BootstrapSeeder seeder;

    @Test void seededAccountsCanSignInAndAccessTheirOwnSites() throws Exception {
        String body = json.writeValueAsString(Map.of("email", "operator@kirish.com", "password", "12345678"));
        String response = mvc.perform(post("/v1/auth/login").contentType("application/json").content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("MEMBER"))
            .andReturn().getResponse().getContentAsString();
        String token = json.readTree(response).get("token").asText();
        mvc.perform(get("/v1/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("OPERATOR"));
        mvc.perform(get("/v1/sites").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Kirish Farm"));
        mvc.perform(get("/v1/admin/users").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test void claimedRoleHeadersCannotBypassAuthentication() throws Exception {
        mvc.perform(get("/v1/platform/corporations").header("X-User-Id", UUID.randomUUID().toString())
            .header("X-Corporation-Id", UUID.randomUUID().toString()).header("X-Role", "SUPER_ADMIN"))
            .andExpect(status().isUnauthorized());
    }

    @Test void superAdminCanSelectAnotherCorporationButOperatorCannot() throws Exception {
        String testCorporation = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO corporations(id,workspace_code,name,status,default_timezone) VALUES (?,'TEST-CONTEXT','Test Context','ACTIVE','Asia/Colombo')", testCorporation);
        String superBody = json.writeValueAsString(Map.of("email", "superadmin@gmail.com", "password", "12345678"));
        String superResponse = mvc.perform(post("/v1/auth/login").contentType("application/json").content(superBody))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String superToken = json.readTree(superResponse).get("token").asText();
        mvc.perform(post("/v1/auth/context").header("Authorization", "Bearer " + superToken)
            .contentType("application/json").content(json.writeValueAsString(Map.of("corporationId", testCorporation))))
            .andExpect(status().isOk());
        mvc.perform(get("/v1/me").header("Authorization", "Bearer " + superToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.activeCorporationId").value(testCorporation));

        String operatorBody = json.writeValueAsString(Map.of("email", "operator@kirish.com", "password", "12345678"));
        String operatorResponse = mvc.perform(post("/v1/auth/login").contentType("application/json").content(operatorBody))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String operatorToken = json.readTree(operatorResponse).get("token").asText();
        mvc.perform(post("/v1/auth/context").header("Authorization", "Bearer " + operatorToken)
            .contentType("application/json").content(json.writeValueAsString(Map.of("corporationId", testCorporation))))
            .andExpect(status().isForbidden());
        String operatorId = jdbc.queryForObject("SELECT id FROM users WHERE email='operator@kirish.com'", String.class);
        String testSite = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO corporation_memberships(corporation_id,user_id,corporate_role,status) VALUES (?,?,'MEMBER','ACTIVE')",
            testCorporation, operatorId);
        jdbc.update("INSERT INTO sites(id,corporation_id,name,type,location,timezone,health) " +
            "VALUES (?,?,'Test Assigned Site','FARM','Test','Asia/Colombo','HEALTHY')", testSite, testCorporation);
        jdbc.update("INSERT INTO site_grants(corporation_id,site_id,user_id,permission_profile) VALUES (?,?,?,'OPERATOR')",
            testCorporation, testSite, operatorId);
        mvc.perform(post("/v1/auth/context").header("Authorization", "Bearer " + operatorToken)
            .contentType("application/json").content(json.writeValueAsString(Map.of("corporationId", testCorporation))))
            .andExpect(status().isOk());
        mvc.perform(get("/v1/sites").header("Authorization", "Bearer " + operatorToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Test Assigned Site"));
        mvc.perform(get("/v1/me/workspaces").header("Authorization", "Bearer " + operatorToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        jdbc.update("DELETE FROM auth_sessions WHERE corporation_id=?", testCorporation);
        jdbc.update("DELETE FROM site_grants WHERE site_id=?", testSite);
        jdbc.update("DELETE FROM sites WHERE id=?", testSite);
        jdbc.update("DELETE FROM corporation_memberships WHERE corporation_id=?", testCorporation);
        jdbc.update("DELETE FROM corporations WHERE id=?", testCorporation);
    }

    @Test void startupBootstrapDoesNotDuplicateExistingRows() {
        seeder.seed(); seeder.seed();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM corporations", Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email='superadmin@gmail.com'", Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM devices WHERE serial='KIR-AT8X-001'", Long.class)).isEqualTo(1);
    }
}
