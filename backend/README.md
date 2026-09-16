# Kirish backend

Spring Boot API for persisted corporation, site, equipment, operational flow, schedule, alert, and admin data.

The backend uses PostgreSQL for every normal run. Set `DATABASE_URL` (a JDBC PostgreSQL URL), `DATABASE_USER`, `DATABASE_PASSWORD`, and `CORS_ALLOWED_ORIGINS` (comma-separated web app origins). The default address is `jdbc:postgresql://localhost:5432/agrothulir?stringtype=unspecified`; `compose.yml` includes a Docker PostgreSQL example. For a local Maven run, create an ignored `backend/application-local.yml` with `spring.datasource.username` and `spring.datasource.password`; the repository's local copy is configured for the installed PostgreSQL server. Environment variables override that local file. H2 is only on the test classpath. Flyway applies the clean UUID schema from `db/migration_uuid` before startup seeding. This migration path requires a one-time schema reset if upgrading a database created with the older text-ID migrations.

The startup seeder creates missing Kirish records without replacing existing ones: Kirish Corp, the two admins, site manager, operator, farm and greenhouse sites, grants, offline sample devices and components, a published Farm Motor operational flow (valve then motor), and a disabled sample schedule. All ID columns use PostgreSQL UUID. Demo header authentication has been removed.

| Role | Email | Initial password |
| --- | --- | --- |
| Super admin | `superadmin@gmail.com` | `12345678` |
| Kirish Corp admin | `kirish@gmail.com` | `12345678` |
| Site manager | `sitemanager@kirish.com` | `12345678` |
| Operator | `operator@kirish.com` | `12345678` |

Passwords are stored as BCrypt hashes. Existing seeded users keep their passwords across restarts. Replace these initial passwords after deployment.

`POST /v1/auth/login` accepts `{ "email": "...", "password": "..." }` and returns a bearer token. Send `Authorization: Bearer <token>` to all other `/v1` routes. `POST /v1/auth/logout` revokes it. A super admin can select a corporation with `POST /v1/auth/context` and `{ "corporationId": "..." }`.

The admin web app uses `/v1/admin/users`, `/v1/admin/sites`, `/v1/admin/devices`, `/v1/admin/devices/{deviceId}/components`, and `/v1/admin/sites/{siteId}/operational-flows` to register equipment and configure ordered steps. `PUT /v1/admin/operational-flows/{flowId}` reorders or renames a flow. The mobile app reads `/v1/sites/{siteId}/operational-flows` and requests ON/OFF through `/v1/operational-flows/{flowId}/actions` with an `Idempotency-Key`. ON follows configured order; OFF follows reverse order. Each step waits for confirmed device feedback before the next command is queued. Older direct component-command routes are unavailable, so API clients must operate published flows.

Sample devices are bootstrap records and start offline; no sensor readings are fabricated. `MqttDeviceService` currently logs handoff and feedback only. It does not connect to a broker or publish physical commands. Requests remain pending and can time out until a controller integration reports feedback. The authenticated HTTP device-ingest endpoints provide a feedback/polling adapter for integration testing; they are not an MQTT implementation. The sample schedule starts disabled and no schedule executor operates hardware.

To clear all application data while keeping the UUID schema, stop the API and run `psql -v ON_ERROR_STOP=1 -f reset_user_data.sql` against the configured PostgreSQL database. The script preserves Flyway history, and the next API startup recreates only the Kirish bootstrap records. This requires a database role that can truncate the application tables. For an existing text-ID database, drop and recreate its dedicated schema before booting this version; the UUID migrations cannot convert text IDs in place.

Run with Java 21: `mvn spring-boot:run` from `backend/`. Verify with `mvn test`.
