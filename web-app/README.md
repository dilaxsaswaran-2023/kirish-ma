# Kirish admin web

React + Vite admin portal. It reads and writes only through the backend API; there are no client-side demo records.

Run `npm install` and `npm run dev` from `web-app/`. `npm run build` produces the static site in `dist/`. `VITE_BASE_URL` in `.env` currently points to the hosted ngrok tunnel. Update it if the tunnel changes, then restart Vite or rebuild. Set `CORS_ALLOWED_ORIGINS` on the backend to the web site's origin (for local Vite, `http://localhost:5173`).

Sign in with a seeded admin account from [backend/README.md](../backend/README.md). Super admins can list and create corporations, select a corporation, and manage its records. Corporate admins can manage members and sites. Open a site from the Sites table to register devices and their valve, motor, pump, relay, switch, or sensor components. Site managers can do this in granted sites and create an operational flow by choosing controllable components and moving them into ON order; OFF runs in reverse. Schedules and alerts can be acted on according to backend role checks.
