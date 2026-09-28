# Kirish / AgroThulir

- `backend/` — Spring Boot API with persisted data, startup seeding, and password-backed bearer sessions.
- `mobile-app/` — React Native device-control app for assigned sites and operational flow ON/OFF requests.
- `web-app/` — React admin portal for corporations, site equipment, ordered operational flows, schedules, alerts, and audit activity.

Both clients read their hosted backend URL from `.env`. The production Compose stack exposes the web app on port `8030` and the backend API on port `5030`; set `PUBLIC_WEB_URL` and `PUBLIC_API_URL` in `.env.production` accordingly. The backend persists normal runs in PostgreSQL; H2 is used only in tests. See each app's README for local commands and seeded accounts.
