# Kirish MQTT: setup and testing

## Architecture

`Web / Mobile → REST backend → PostgreSQL command outbox → MQTT broker → device`

`Device / MQTT Explorer → MQTT telemetry & feedback → backend → PostgreSQL → Web / Mobile`

The apps do **not** connect directly to MQTT. Commands originate in authenticated REST requests. Broker delivery never means a motor has physically changed: only matching device feedback confirms a step. ON starts the configured sequence; OFF executes it in reverse. Motor components receive `START` / `STOP` and report `RUNNING` / `STOPPED`. Valves use `OPEN` / `CLOSE` and report `OPEN` / `CLOSED`. Relays use `ON` / `OFF`.

The backend uses the existing **Sathurix** broker at `mqtt.sathurix.com:8883` with TLS and hostname/certificate validation. The separate Kirish Mosquitto container on 8884 is stopped and restart-disabled, and is no longer defined in production Compose. At migration time, the Sathurix hostname resolves to the same VM's existing VerneMQ service; that existing broker must remain running. No broker installation is managed by the backend deployment.

Backend services: `MqttDeviceService` owns the connection/reconnect lifecycle; `MqttSubscriberService` listens for telemetry, feedback and status; `MqttIngestService` validates/stores messages transactionally; `MqttOutboxDispatcher` dispatches committed commands through `MqttPublisherService`. No frontend MQTT connection is needed.

## MQTT Explorer connection

Use the official [MQTT Explorer desktop client](https://mqtt-explorer.com/).

| Setting | Value |
| --- | --- |
| Name | Sathurix |
| Protocol | MQTT over TCP (`mqtt://` with Encryption/TLS enabled; not WebSockets) |
| Host | `mqtt.sathurix.com` |
| Port | `8883` |
| Encryption / TLS | ON |
| Validate certificate | ON |
| Username / password | Leave both blank, matching the supplied screenshot |
| Advanced → CA certificate | Leave empty; use the system's trusted CAs, not the retired Kirish CA |
| Client certificate / private key | Leave empty |
| Client ID | A unique name such as `kirish-explorer-user-1` (never `kirish-backend-vm`) |
| Advanced → subscription | `subscribeTopic` in the private connection JSON; QoS 1 |

Keep certificate validation ON. The old `kirish-mqtt-ca.crt` is for the retired 8884 listener and must not be used for Sathurix. MQTT Explorer displays `mqtt://` plus its TLS switch; Java Paho requires `ssl://mqtt.sathurix.com:8883`, without a trailing slash.

The server's root-only connection file is `/opt/kirish-ma-private/mqtt-connection-private.json`. The local copy is `D:\apps\kirish-ma\mqtt-connection-private.json`. It contains the device token, exact topics and component IDs. **Do not commit, screenshot, or share that file.**

Use only the dedicated `MQTT Test Device (no hardware)` in `Kirish Farm → MQTT Test Zone`. Read its `commands` and `results`; publish its `telemetry`, `feedback`, and `status`.

**Security limitation:** the current Sathurix broker permits anonymous publish/subscribe. This configuration does not provide device-specific broker ACLs. Other connected clients may read payloads (including device tokens) or inject command-topic messages. TLS protects transport but does not authorize publishers. Do not connect physical motors until the broker administrator enables credentials and device-scoped ACLs, or the controller protocol gains independent message authentication. Backend per-device token checks remain enabled; they are not a substitute for broker authorization.

## 1. Publish live state and sensor readings

Open PowerShell in the repository:

```powershell
.\deploy\mqtt\build-message.ps1 -Kind telemetry
```

Copy the printed topic and JSON into MQTT Explorer's Publish panel. Select JSON, **QoS 1**, and **Retain OFF**. The script generates a new UUID and current UTC timestamp. The body has this shape (use the actual token/IDs from the private file):

```json
{
  "messageId": "NEW-UUID",
  "token": "DEVICE-TOKEN",
  "measuredAt": "CURRENT-UTC-TIME",
  "samples": [
    {"componentId": "MOTOR-ID", "reportedState": "STOPPED", "quality": "CONFIRMED"},
    {"componentId": "TEMPERATURE-ID", "reportedState": "VALID", "quality": "CONFIRMED", "value": "28.4", "unit": "C"},
    {"componentId": "HUMIDITY-ID", "reportedState": "VALID", "quality": "CONFIRMED", "value": "72", "unit": "%"}
  ]
}
```

Look under `results` for `stored: true`. The device becomes online and the values appear in its web/mobile device page. These are **manually supplied test measurements**, stored through the real MQTT/database pipeline—not readings from physical sensors.

Messages must be newer than the last component measurement and within 90 seconds of server time (at most 30 seconds ahead). Generate a fresh message every time; replaying the same `messageId` is deduplicated. All samples in a batch commit together. Always publish with Retain OFF. The backend rejects messages delivered with the retained flag, but MQTT 3.1.1 does not expose that flag on live forwarding; retention policy belongs to the external broker and is not enforced by this deployment. Wrong tokens, foreign component IDs and invalid states are rejected by the backend. A single sample can also be sent at the top level instead of `samples`.

## 2. Test motor ON

Sign into web (`http://45.67.221.203:8030`) or mobile. Open `Kirish Farm → MQTT Test Zone → MQTT Test Device (no hardware)` and press **ON / Start** for `MQTT Test Motor`. Confirm the request.

Watch its `commands` topic in Explorer. Example:

```json
{
  "protocolVersion": 1,
  "commandId": "COMMAND-UUID",
  "runId": "RUN-UUID",
  "deviceId": "DEVICE-ID",
  "componentId": "MOTOR-ID",
  "hardwareChannel": "relay-1",
  "kind": "MOTOR",
  "action": "START",
  "expectedState": "RUNNING",
  "issuedAt": "UTC-TIME",
  "expiresAt": "UTC-TIME-45-SECONDS-LATER"
}
```

Copy **that commandId** and generate feedback:

```powershell
.\deploy\mqtt\build-message.ps1 -Kind start-feedback -CommandId 'COPY-COMMAND-ID-HERE'
```

Publish to the printed `feedback` topic, QoS 1, Retain OFF, **before the command expires**. The body reports `RUNNING` with `quality: CONFIRMED` and the matching command ID. The backend confirms the operation; web refreshes every 5 seconds and mobile every 15 seconds. Without feedback, the run remains pending and times out after 45 seconds. If it expires, publish fresh actual state, refresh, and request a new operation; never reuse the old command.

## 3. Test motor OFF

Press **OFF / Stop** in the app. Explorer receives a new command with `action: STOP`. Generate and publish its acknowledgement:

```powershell
.\deploy\mqtt\build-message.ps1 -Kind stop-feedback -CommandId 'COPY-NEW-COMMAND-ID-HERE'
```

The backend should now show the flow as OFF and the motor as STOPPED. Do not publish STOPPED telemetry while pretending the test motor is running; Explorer represents the device's actual current state.

## Offline and controller requirements

Publish `build-message.ps1 -Kind offline` to mark the test device offline, or stop reporting for 120 seconds. Hardware must send current component feedback at least every 30–60 seconds; sensors alone do not keep stale motor feedback confirmed. A Last Will can use the same OFFLINE status body with a fresh session message ID, QoS 1, Retain OFF.

Real controllers need their own broker account/ACL and per-device token—not this test account. Synchronize UTC time; connect with a clean session; subscribe only to their command topic; persistently deduplicate command IDs; reject expired commands; map the configured hardware channel; verify actual relay/contactor feedback before acknowledging; and provide local emergency stop, watchdog and electrical interlocks. Do not acknowledge a command merely because it arrived. No backend or network state can substitute for physical feedback. Initial deployment tests intentionally operate only the no-hardware Explorer device.

## VM operations

Backend connection settings are in the VM's ignored `.env.production`; see `deploy/mqtt/sathurix.env.example`. `python3 deploy/mqtt/use-sathurix.py`, run as root from `/opt/kirish-ma`, backs up and updates the VM env/private connection file while preserving device IDs and tokens. It does not install or manage a broker. `provision.py` is retired and refuses to run. The old local broker files/volume are retained only for recovery, not mounted by the current deployment.

```bash
docker compose --env-file .env.production -f compose.prod.yml ps
docker compose --env-file .env.production -f compose.prod.yml logs --tail 100 api
docker inspect -f '{{.State.Status}} restart={{.HostConfig.RestartPolicy.Name}}' kirish-mqtt-1
```

New integrations use the existing REST routes; no MQTT passwords belong in browser or mobile env files. `/v1/devices/{id}/diagnostics` reports the backend broker connection status. A disconnected broker rejects new operations with `MQTT_UNAVAILABLE`. Existing accounts, equipment and real history are preserved. Flyway V5 adds message deduplication; V6 removes only old sensor readings labelled `SEEDED`. A pre-deployment database dump is retained under `/opt/backups`.

Use `/v1/operational-flows/{id}/actions` for motor and valve control, as the current web/mobile device screens do. With MQTT enabled, the unused legacy `/v1/components/{id}/commands` prototype returns `FLOW_CONTROL_REQUIRED` instead of accepting commands that have no executor.

## Automated live test (no physical hardware)

Install `paho-mqtt==2.1.0` in your Python environment. In a separate terminal, open `ssh -N -L 15030:127.0.0.1:5030 root@45.67.221.203` so API login travels through SSH. Then run `python deploy/mqtt/live-test.py` from the repository and enter the operator API password when prompted. The script refuses to operate any device other than the explicit no-hardware Explorer fixture. It checks TLS, telemetry persistence/deduplication, invalid device-token rejection, stale payload rejection and ON/OFF feedback confirmation, and leaves the test motor stopped and device offline. For the anonymous broker it reports that ACL and retained-publish restrictions are not provided; it does not claim or test them as enforced. Close the SSH tunnel afterward.
