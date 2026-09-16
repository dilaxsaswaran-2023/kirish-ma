-- V2 inserted these fixed demonstration records. Keep V2's checksum intact for
-- existing Flyway installations, then remove its records before Kirish bootstrap.
DELETE FROM auth_sessions WHERE user_id IN ('user-anjali', 'user-platform')
   OR corporation_id IN ('corp-greenroot', 'corp-coastal');
DELETE FROM alerts WHERE id IN ('alert-valve', 'alert-offline');
DELETE FROM schedule_occurrences WHERE schedule_id IN ('schedule-morning', 'schedule-dry');
DELETE FROM schedules WHERE id IN ('schedule-morning', 'schedule-dry');
DELETE FROM flows WHERE id IN ('flow-morning', 'flow-greenhouse');
DELETE FROM components WHERE id IN ('valve-a', 'pump-01', 'moisture-01', 'flow-01');
DELETE FROM devices WHERE id IN ('device-controller-01', 'device-climate-01', 'device-controller-02');
DELETE FROM site_grants WHERE site_id IN ('site-north', 'site-greenhouse');
DELETE FROM zones WHERE id IN ('zone-a', 'zone-reservoir');
DELETE FROM sites WHERE id IN ('site-north', 'site-greenhouse', 'site-residence');
DELETE FROM corporation_memberships WHERE corporation_id IN ('corp-greenroot', 'corp-coastal');
DELETE FROM users WHERE id IN ('user-anjali', 'user-platform');
DELETE FROM corporations WHERE id IN ('corp-greenroot', 'corp-coastal');
