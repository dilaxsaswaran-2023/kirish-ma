# AgroThulir — farmer mobile app

A bare React Native (Gradle) Android app for the AgroThulir farmer journey. It talks to the
Spring Boot service in [`../backend`](../backend) and shows only what that service reports —
sites, controllers, components, water paths, schedules, alerts and live run state.

The visual language (forest green, lime, sage, warm white; 56 px actions, 48 px touch targets,
outlined motor/valve/tank/sensor icons) comes from [`../designs/AgroThulir-Farmer`](../designs/AgroThulir-Farmer).

## Requirements

| Tool | Version |
|---|---|
| Node | 22.11 or later |
| JDK | **17 or later** (Gradle 9 refuses JDK 8) |
| Android SDK | Platform 36 + build tools, via `ANDROID_HOME` |

If `java -version` reports 8, point `JAVA_HOME` at a newer JDK before building:

```bash
# PowerShell, current session
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
```

## Run it

Start the backend first — the app has no offline sample data, by design:

```bash
cd ../backend && mvn spring-boot:run
```

Then, with an emulator running or a device connected over USB debugging:

```bash
npm install
npm run android
```

`npm start` runs Metro on its own; `cd android && ./gradlew assembleDebug` builds the APK
without Metro.

### Reaching the service

The sign-in screen carries the service address, and defaults to the right one per platform:

| Running on | Default address |
|---|---|
| Android emulator | `http://10.0.2.2:8080` (the host machine's localhost) |
| Physical device | change it to your computer's LAN address, e.g. `http://192.168.1.20:8080` |

Cleartext HTTP is enabled for debug builds only.

## Identity

The service authenticates demo calls with three headers — `X-User-Id`, `X-Corporation-Id` and
`X-Role` (see `TenantContextInterceptor`). Sign-in collects exactly those and proves them with a
real `GET /v1/me` before any equipment screen opens. The seeded demo identity is
`user-anjali` / `corp-greenroot`; the role selector changes what the service permits, so
picking **View only** really does make the service refuse a start.

## What the app reads and writes

| Screen | Service calls |
|---|---|
| Sign in | `GET /v1/me`, `/v1/me/workspaces`, `/v1/sites` |
| Home | `GET /v1/sites/{id}`, `/v1/devices`, `/v1/devices/{id}`, `/v1/schedules`, `/v1/alerts` |
| Controllers | `GET /v1/devices`, `/v1/devices/{id}`, `/v1/devices/{id}/components` |
| Diagnostics | `GET /v1/devices/{id}/diagnostics`, `/v1/devices/{id}/capabilities` |
| Water now | `POST /v1/components/{id}/commands`, then `GET /v1/commands/{id}` + components |
| Water paths | `GET /v1/flows`, `/v1/sites/{id}/topology`, `POST /v1/flows/{id}/validate`, `/publish`, `/runs` |
| Schedules | `GET /v1/schedules`, `PATCH /v1/schedules/{id}`, `POST /v1/schedules/{id}/preview` |
| Alerts | `GET /v1/alerts`, `POST /v1/alerts/{id}/acknowledgements` |
| Past activity | `GET /v1/audit-events` |

Every control write carries an `Idempotency-Key`, so a retry can never start a second run.

## How the protected run works

The app never treats elapsed time as device feedback. A run's phase is derived from the command
state the service reports plus the component states the controller has actually confirmed:

```
START accepted ──► opening   valve not yet confirmed open, motor held off
               ──► starting  valve confirmed open, waiting for motor-running
               ──► running   motor running and valve open, both confirmed
               ──► blocked   command expired with no valve confirmation

SAFE_STOP      ──► stopping  waiting for confirmed motor-off, valve held open
               ──► closing   motor confirmed off, valve closing
               ──► complete  motor off and valve closed, both confirmed
               ──► unknown   stop expired unconfirmed — treat the motor as running
```

Two consequences worth knowing:

- **The planned run time is a plan, not a cut-off.** This service has no timer that stops a run,
  so when the planned minutes elapse the app says so and asks for a safe stop rather than
  implying the run has ended.
- **A refusal is shown with the service's own reason.** `DEVICE_OFFLINE`, `RESOURCE_BUSY`,
  `STALE_STATE`, `CONTROL_FORBIDDEN` and the rest each get farmer-facing guidance alongside the
  service's message and code, and the app says plainly when nothing was energised.

## Layout

```
App.tsx                  providers + route table
src/theme.ts             design tokens from the design package
src/icons.tsx            the design's outlined icon set, as SVG
src/api/                 client (headers, errors), endpoints, types, error copy
src/state/               session, protected-control machine, resource loading
src/navigation/          stack navigator, routes, tab mapping
src/ui/                  Screen shell, blocks, actions, inputs, topology, state views
src/screens/             one file per area
```

## Checks

```bash
npx tsc --noEmit     # types
npm run lint         # eslint
cd android && ./gradlew assembleDebug
```
