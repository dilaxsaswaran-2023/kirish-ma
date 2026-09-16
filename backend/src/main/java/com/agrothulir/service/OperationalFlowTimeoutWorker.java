package com.agrothulir.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class OperationalFlowTimeoutWorker {
    private final JdbcTemplate jdbc;
    public OperationalFlowTimeoutWorker(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void expireUnconfirmedSteps() {
        List<Map<String, Object>> expired = jdbc.queryForList("SELECT cmd.id AS command_id,frs.id AS step_id," +
            "r.id AS run_id,r.corporation_id,r.site_id,f.name AS flow_name,c.name AS component_name " +
            "FROM flow_run_steps frs JOIN commands cmd ON cmd.id=frs.command_id " +
            "JOIN runs r ON r.id=frs.run_id JOIN flows f ON f.id=r.flow_id " +
            "JOIN components c ON c.id=frs.component_id " +
            "WHERE frs.state='WAITING_FEEDBACK' AND cmd.expires_at<CURRENT_TIMESTAMP");
        for (Map<String, Object> row : expired) {
            if (jdbc.update("UPDATE flow_run_steps SET state='TIMED_OUT' WHERE id=? AND state='WAITING_FEEDBACK'", row.get("step_id")) != 1) continue;
            jdbc.update("UPDATE commands SET state='TIMED_OUT',updated_at=CURRENT_TIMESTAMP WHERE id=?", row.get("command_id"));
            jdbc.update("UPDATE runs SET state='TIMED_OUT',ended_at=CURRENT_TIMESTAMP WHERE id=?", row.get("run_id"));
            jdbc.update("INSERT INTO alerts(id,corporation_id,site_id,severity,title,detail,dedup_key,raised_at) " +
                "VALUES (?,?,?,'CRITICAL',?,?,?,?)", UUID.randomUUID().toString(), row.get("corporation_id"), row.get("site_id"),
                "Flow step not confirmed", row.get("flow_name") + ": " + row.get("component_name") +
                    " did not confirm its state. Check the equipment before another operation.",
                "flow-run-timeout-" + row.get("run_id"), Timestamp.from(Instant.now()));
        }
    }

    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void markSilentDevicesOffline() {
        Timestamp threshold = Timestamp.from(Instant.now().minusSeconds(120));
        jdbc.update("UPDATE components SET feedback_quality='STALE' WHERE device_id IN " +
            "(SELECT id FROM devices WHERE status='ONLINE' AND last_seen_at<?)", threshold);
        jdbc.update("UPDATE devices SET status='OFFLINE' WHERE status='ONLINE' AND last_seen_at<?", threshold);
    }
}
