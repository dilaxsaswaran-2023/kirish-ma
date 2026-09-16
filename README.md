# Kirish / AgroThulir

- `backend/` — Spring Boot API with persisted data, startup seeding, and password-backed bearer sessions.
- `mobile-app/` — React Native device-control app for assigned sites and operational flow ON/OFF requests.
- `web-app/` — React admin portal for corporations, site equipment, ordered operational flows, schedules, alerts, and audit activity.

Both clients read their hosted backend URL from `.env` and currently point to the ngrok tunnel. Change those URLs if the tunnel changes. The backend persists normal runs in PostgreSQL; H2 is used only in tests. Set `CORS_ALLOWED_ORIGINS` for the web app origin. See each app's README for local commands and seeded accounts.
