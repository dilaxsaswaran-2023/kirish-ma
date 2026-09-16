# AgroThulir mobile

Bare React Native device-control app. Sign-in loads the user's corporation memberships and assigned sites from the backend. The first corporation is selected by default; the corporation picker and an All-sites filter let users find a site. Site pages show published operational flows with prominent ON/OFF buttons, ordered components, devices, schedules, sensor readings, alerts, and past operations. The app has no offline demo dataset or direct component-control screen.

Install with `npm install`, start Metro with `npm start`, and run Android with `npm run android`. Node 22.11+ and JDK 17+ are required for the Android build.

`BASE_URL` in `.env` is bundled by `react-native-dotenv` and currently points to the hosted ngrok tunnel. Update it when the backend tunnel changes, then rebuild the app. The sign-in screen accepts an email and password; the backend returns a bearer token and derives the user's corporation, site grants, and role from PostgreSQL. Seeded site manager and operator accounts are listed in [backend/README.md](../backend/README.md).

Flow ON/OFF requests use an `Idempotency-Key` and display the pending or confirmed run state. ON executes components in web-configured order; OFF reverses that order. Sample devices start offline, so their buttons stay disabled until a real controller reports confirmed states. The MQTT service currently logs only; broker publishing remains to be implemented.
