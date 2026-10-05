# AgroThulir mobile

Farmer-focused React Native device-control app. Sign-in loads the user's corporation memberships and assigned sites from the backend. Home has a corporation dropdown and two zone cards per row, grouped by site. Choose a zone, then a device. Device pages show large Start/Stop buttons, clear status, latest sensor readings and equipment cards. Past readings and manager-only component configuration, display arrangement and operation ordering are expandable sections. Back and Home buttons make it easy to return to the farm. The app has no offline demo dataset or direct component-control screen.

Install with `npm install`, start Metro with `npm start`, and run Android with `npm run android`. Node 22.11+ and JDK 17+ are required for the Android build.

`BASE_URL` in `.env` is bundled by `react-native-dotenv` and points to `http://45.67.221.203:5030`. Update it when the backend address changes, then rebuild the app. Android currently allows cleartext HTTP for this endpoint; HTTPS is recommended before wider production use. The sign-in screen accepts an email and password; the backend returns a bearer token and derives the user's corporation, site grants, and role from PostgreSQL. Seeded site manager and operator accounts are listed in [backend/README.md](../backend/README.md).

Start/Stop requests use an `Idempotency-Key` and require a confirmation dialog naming affected equipment. Start executes components in the configured order; Stop reverses it. Controls stay disabled when feedback is unconfirmed, devices are offline, an operation is pending, or the last refresh failed. A sent request is never presented as a confirmed equipment change. Sample devices start offline until a real controller reports confirmed states. The MQTT service currently logs only; broker publishing remains to be implemented.

Android 1.1 (version code 2) can be built with JDK 21 from `android` using `gradlew.bat app:assembleRelease --no-daemon --max-workers=1 -PreactNativeArchitectures=arm64-v8a`. This produces an ARM64 APK. Release builds currently use the debug signing key and are for internal testing, not Play Store publication.
