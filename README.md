# AgroThulir

Implementation based on `AgroThulir-Product-and-Backend-Design.md`.

- `mobile/` — Expo React Native app with operator, site, equipment, flow, schedule, alert, corporate admin, and platform admin journeys.
- `backend/` — Spring Boot 3.5 modular API with PostgreSQL/Flyway production configuration, tenant/site authorization, command idempotency, resource fencing, outbox dispatch, schedules, alerts, and audit events.

## Start locally

1. Run `mvn spring-boot:run` in `backend` (Java 21).
2. With Node.js 22.13+, run `npm start` in `mobile`.
3. Open Expo on Android, iOS, or web. Set `EXPO_PUBLIC_API_URL` when the backend is not reachable at the Android-emulator default `http://10.0.2.2:8080`.

The demo login accepts the prefilled credentials. The mobile app can be explored without the backend; command requests use the API when it is reachable.
