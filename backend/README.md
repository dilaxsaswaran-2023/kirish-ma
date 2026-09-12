# AgroThulir backend

Spring Boot modular service for tenant-scoped configuration, equipment control, schedules, alerts, and administration.

## Local demo

Requires Java 21 and Maven 3.6.3+.

```bash
mvn spring-boot:run
```

The default profile uses an in-memory H2 database, applies Flyway migrations, and seeds the same GreenRoot demo shown in the mobile app. API calls may omit the demo identity headers; production disables this behavior.

```bash
curl http://localhost:8080/v1/sites \
  -H "X-User-Id: user-anjali" \
  -H "X-Corporation-Id: corp-greenroot" \
  -H "X-Role: OPERATOR"
```

## Production profile

Build the jar, then use `compose.yml` or provide `DATABASE_URL`, `DATABASE_USER`, and `DATABASE_PASSWORD` with the `prod` profile. Replace the demo header adapter with verified OIDC claims before exposing the service.

Control writes are transactional: they create a run, command, fenced resource reservations, and outbox event before returning HTTP 202. The included dispatcher is a deterministic demo controller adapter; connect its outbox seam to the commissioned MQTT 5 publisher and ingest real device acknowledgements in production.
