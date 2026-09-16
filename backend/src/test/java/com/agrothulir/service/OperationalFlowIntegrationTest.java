package com.agrothulir.service;

import com.fasterxml.jackson.databind.JsonNode;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"spring.task.scheduling.enabled=false",
    "spring.datasource.url=jdbc:h2:mem:agrothulir-flow-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
    "spring.datasource.username=sa", "spring.datasource.password="})
@AutoConfigureMockMvc
class OperationalFlowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @Test void orderedFlowWaitsForFeedbackBeforeAdvancingAndStopsInReverseOrder() throws Exception {
        String operator = login("operator@kirish.com");
        String admin = login("kirish@gmail.com");
        String siteId = jdbc.queryForObject("SELECT id FROM sites WHERE name='Kirish Farm'", String.class);
        String deviceId = jdbc.queryForObject("SELECT id FROM devices WHERE serial='KIR-AT8X-001'", String.class);
        String valveId = jdbc.queryForObject("SELECT id FROM components WHERE hardware_channel='DO1 / DI1'", String.class);
        String motorId = jdbc.queryForObject("SELECT id FROM components WHERE hardware_channel='DO2 / DI2'", String.class);
        String flowId = jdbc.queryForObject("SELECT id FROM flows WHERE name='Farm Motor'", String.class);
        assertThat(UUID.fromString(flowId).toString()).isEqualTo(flowId);
        assertThat(UUID.fromString(valveId).toString()).isEqualTo(valveId);

        JsonNode flow = read("/v1/operational-flows/" + flowId, operator);
        assertThat(flow.get("steps").get(0).get("component_id").asText()).isEqualTo(valveId);
        assertThat(flow.get("steps").get(1).get("component_id").asText()).isEqualTo(motorId);
        assertThat(read("/v1/sites/" + siteId + "/operational-flows", operator).size()).isEqualTo(1);

        mvc.perform(post("/v1/operational-flows/" + flowId + "/actions")
            .header("Authorization", bearer(operator)).header("Idempotency-Key", "offline-attempt")
            .contentType("application/json").content(body(Map.of("action", "ON"))))
            .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM runs", Long.class)).isZero();

        JsonNode credential = write("/v1/admin/devices/" + deviceId + "/credential", admin, null, Map.of());
        String deviceToken = credential.get("token").asText();
        feedback(deviceId, deviceToken, valveId, "CLOSED", null);
        feedback(deviceId, deviceToken, motorId, "STOPPED", null);

        JsonNode on = write("/v1/operational-flows/" + flowId + "/actions", operator, "flow-on", Map.of("action", "ON"));
        String onRun = on.get("id").asText();
        assertThat(on.get("state").asText()).isEqualTo("WAITING_FEEDBACK");
        assertThat(on.get("steps").get(0).get("action").asText()).isEqualTo("OPEN");
        assertThat(on.get("steps").get(1).get("action").asText()).isEqualTo("START");
        assertThat(on.get("steps").get(1).get("state").asText()).isEqualTo("WAITING");
        String valveCommand = on.get("steps").get(0).get("command_id").asText();
        feedback(deviceId, deviceToken, valveId, "OPEN", valveCommand);
        JsonNode mid = read("/v1/operational-runs/" + onRun, operator);
        assertThat(mid.get("steps").get(0).get("state").asText()).isEqualTo("CONFIRMED");
        assertThat(mid.get("steps").get(1).get("state").asText()).isEqualTo("WAITING_FEEDBACK");
        feedback(deviceId, deviceToken, motorId, "RUNNING", mid.get("steps").get(1).get("command_id").asText());
        assertThat(read("/v1/operational-runs/" + onRun, operator).get("state").asText()).isEqualTo("CONFIRMED");
        assertThat(read("/v1/operational-flows/" + flowId, operator).get("currentState").asText()).isEqualTo("ON");

        JsonNode off = write("/v1/operational-flows/" + flowId + "/actions", operator, "flow-off", Map.of("action", "OFF"));
        assertThat(off.get("steps").get(0).get("component_id").asText()).isEqualTo(motorId);
        assertThat(off.get("steps").get(0).get("action").asText()).isEqualTo("STOP");
        assertThat(off.get("steps").get(1).get("component_id").asText()).isEqualTo(valveId);
        assertThat(off.get("steps").get(1).get("action").asText()).isEqualTo("CLOSE");
        feedback(deviceId, deviceToken, motorId, "STOPPED", off.get("steps").get(0).get("command_id").asText());
        JsonNode offMid = read("/v1/operational-runs/" + off.get("id").asText(), operator);
        feedback(deviceId, deviceToken, valveId, "CLOSED", offMid.get("steps").get(1).get("command_id").asText());
        assertThat(read("/v1/operational-runs/" + off.get("id").asText(), operator).get("state").asText()).isEqualTo("CONFIRMED");
        assertThat(read("/v1/operational-flows/" + flowId, operator).get("currentState").asText()).isEqualTo("OFF");

        JsonNode newComponent = write("/v1/admin/devices/" + deviceId + "/components", admin, null,
            Map.of("kind", "RELAY", "name", "Auxiliary Relay", "hardwareChannel", "DO3 / DI3"));
        String relayId = newComponent.get("id").asText();
        JsonNode created = write("/v1/admin/sites/" + siteId + "/operational-flows", admin, null,
            Map.of("name", "Auxiliary Sequence", "componentIds", java.util.List.of(valveId, relayId)));
        String createdId = created.get("id").asText();
        assertThat(created.get("steps").get(0).get("component_id").asText()).isEqualTo(valveId);
        assertThat(read("/v1/sites/" + siteId + "/operational-flows", operator).size()).isEqualTo(2);
        String updatedResponse = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
            .put("/v1/admin/operational-flows/" + createdId).header("Authorization", bearer(admin))
            .contentType("application/json")
            .content(body(Map.of("name", "Auxiliary Sequence", "componentIds", java.util.List.of(relayId, valveId)))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode updated = json.readTree(updatedResponse);
        assertThat(updated.get("steps").get(0).get("component_id").asText()).isEqualTo(relayId);
        assertThat(updated.get("published_version").asInt()).isEqualTo(2);
    }

    private String login(String email) throws Exception {
        String response = mvc.perform(post("/v1/auth/login").contentType("application/json")
            .content(body(Map.of("email", email, "password", "12345678"))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("token").asText();
    }
    private JsonNode read(String path, String token) throws Exception {
        String response = mvc.perform(get(path).header("Authorization", bearer(token)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }
    private JsonNode write(String path, String token, String key, Map<String, ?> payload) throws Exception {
        var request = post(path).header("Authorization", bearer(token)).contentType("application/json").content(body(payload));
        if (key != null) request.header("Idempotency-Key", key);
        String response = mvc.perform(request).andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }
    private void feedback(String deviceId, String token, String componentId, String state, String commandId) throws Exception {
        var payload = new java.util.HashMap<String, Object>(Map.of("componentId", componentId, "reportedState", state, "quality", "CONFIRMED"));
        if (commandId != null) payload.put("commandId", commandId);
        mvc.perform(post("/v1/device-ingest/" + deviceId + "/feedback")
            .header("X-Device-Token", token).contentType("application/json").content(body(payload)))
            .andExpect(status().isOk());
    }
    private String body(Object value) throws Exception { return json.writeValueAsString(value); }
    private String bearer(String token) { return "Bearer " + token; }
}
