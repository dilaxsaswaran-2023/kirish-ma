package com.agrothulir.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Component
public class CommandLifecycleWorker {
    private final JdbcTemplate jdbc;
    public CommandLifecycleWorker(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Scheduled(fixedDelay = 750)
    @Transactional
    public void dispatch() {
        List<Map<String, Object>> events = jdbc.queryForList("SELECT id,aggregate_id FROM outbox_events WHERE dispatched_at IS NULL ORDER BY created_at FETCH FIRST 25 ROWS ONLY");
        for (Map<String, Object> event : events) {
            String eventId = event.get("id").toString(); String commandId = event.get("aggregate_id").toString();
            jdbc.update("UPDATE outbox_events SET dispatched_at=CURRENT_TIMESTAMP,attempts=attempts+1 WHERE id=? AND dispatched_at IS NULL", eventId);
            jdbc.update("UPDATE commands SET state='EXECUTING',updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='ACCEPTED'", commandId);
            jdbc.update("UPDATE runs SET state='EXECUTING' WHERE id=(SELECT run_id FROM commands WHERE id=?) AND state='ACCEPTED'", commandId);
        }
    }

    @Scheduled(fixedDelay = 1000, initialDelay = 1500)
    @Transactional
    public void reconcileDemoControllers() {
        Timestamp threshold = Timestamp.from(Instant.now().minusMillis(900));
        List<Map<String, Object>> commands = jdbc.queryForList("SELECT id,run_id,component_id,action FROM commands WHERE state='EXECUTING' AND updated_at<?", threshold);
        for (Map<String, Object> command : commands) {
            String id = command.get("id").toString(), runId = command.get("run_id").toString(), componentId = command.get("component_id").toString(), action = command.get("action").toString();
            if ("START".equals(action)) {
                jdbc.update("UPDATE components SET reported_state='OPEN',feedback_quality='CONFIRMED',state_version=state_version+1,measured_at=CURRENT_TIMESTAMP WHERE id='valve-a'");
                jdbc.update("UPDATE components SET reported_state='RUNNING',feedback_quality='CONFIRMED',state_version=state_version+1,measured_at=CURRENT_TIMESTAMP WHERE id=?", componentId);
                jdbc.update("UPDATE commands SET state='CONFIRMED',updated_at=CURRENT_TIMESTAMP WHERE id=?", id);
                jdbc.update("UPDATE runs SET state='CONFIRMED' WHERE id=?", runId);
            } else {
                jdbc.update("UPDATE components SET reported_state='STOPPED',feedback_quality='CONFIRMED',state_version=state_version+1,measured_at=CURRENT_TIMESTAMP WHERE id=?", componentId);
                jdbc.update("UPDATE components SET reported_state='CLOSED',feedback_quality='CONFIRMED',state_version=state_version+1,measured_at=CURRENT_TIMESTAMP WHERE id='valve-a'");
                jdbc.update("UPDATE commands SET state='STOPPED',updated_at=CURRENT_TIMESTAMP WHERE id=?", id);
                jdbc.update("UPDATE runs SET state='STOPPED',ended_at=CURRENT_TIMESTAMP WHERE id=?", runId);
                jdbc.update("DELETE FROM resource_reservations WHERE resource_id IN (?, 'valve-a')", componentId);
            }
        }
    }
}
