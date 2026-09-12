# AgroThulir — Farmer Controls & Connected Flows

Prepared 12 September 2026. New designs limited to the five requested feature areas. No corporate administration or backend implementation is included.

## Delivery status

The Figma connection created [a new design file](https://www.figma.com/design/8euERqFtJVXeJbuIDjFq7X), then both inspection and editing returned the Starter-plan tool-call limit. **That online file is still empty.** This package contains the complete design definitions, an offline clickable preview, and a native Figma plugin that builds the editable screen set with prototype links. The plugin has not been executed in native Figma; native rendering and Present-mode verification remain pending.

## Open the clickable preview

Open **AgroThulir-Preview.html** in Chrome or Edge. It is self-contained and works offline. Use the buttons inside the phone, choose a flow on the left, or select any screen from the dropdown. Scroll inside long phone screens. Turn off “Simulate controller confirmations” to inspect waiting and failure states without automatic navigation.

## Create the screens in Figma

1. Extract the ZIP into a folder.
2. Open the new design file, or another editable design file, in the **Figma desktop app**.
3. Right-click the canvas → **Plugins → Development → Import plugin from manifest…** and select `manifest.json` from the extracted folder.
4. Run **Plugins → Development → AgroThulir Farmer Flows** once. It adds a new page and leaves existing screens intact.
5. Open **Present** and choose one of the seven named starting flows.

No npm installation or code editing is needed. `code.js` is already bundled, and the plugin does not request network access. Figma documents the desktop import workflow in its [official plugin examples](https://github.com/figma/plugin-samples#getting-started) and [quickstart guide](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/).

## Farmer-first visual direction

- Forest green, fresh lime, pale sage and warm white.
- Recognisable outlined motor, valve, pipe, tank and water icons.
- Large 56 px action buttons; 48 px connection-port hit areas.
- Short labels paired with icons; readable numbers and units.
- A prominent **Water now** action.
- Confirmed, pending, blocked and unknown states use both words and visual cues.
- 412 × 892 mobile frames with scrollable content, editable text, vector equipment nodes, theme variables, reusable icon and button components, and native prototype reactions.

## Requested feature coverage

| Feature | Included screens and states |
|---|---|
| Welcome and dashboard | Welcome, sign-in example, field overview, live-reading examples and quick actions |
| Sites, devices, components | Sites list, create site, empty site, controller scan/code/found states, controller details, equipment picker, motor/valve/sensor/tank setup, saved states, component detail and readings |
| Protected manual control | Valve selection, duration presets, review, valve-opening feedback, motor-start feedback, live watering, safe-stop review, motor-off wait, valve-close wait, stopped/completed results, valve-only operation, blocked start, blocked valve close, offline and unknown-stop recovery |
| Physical topology and run order | Empty canvas, equipment picker, placed motor, placed valve, outlet selection, inlet selection, connected path, connection edit/delete, second branch, saved path, action picker, wait configuration, motor action, valve action, safe shutdown, reorder, invalid order and validation |
| Scheduling and alerts | Schedule list, path selection, time/recurrence, duration, review, overlap warning, corrected time, saved/list states, detail, pause/resume/delete, empty schedule list, alerts, fault detail, acknowledgement, unresolved/seen state and history |

## Prototype journeys

1. **Welcome to watering:** Welcome → Sign in → Dashboard → Water now → Review → Opening valve → Starting motor → Watering.
2. **Equipment setup:** Controllers → Add controller → Scan or enter code → Controller found → Controller → Components → Add component → Setup → Saved.
3. **Safe stop:** Watering → Stop watering → Confirm stop → Waiting for motor off → Closing valve → Safe stop confirmed.
4. **Create a directional path:** Water paths → New → Add component → Motor → Add valve → Valve A → Tap motor outlet → Tap valve inlet → Connected path → Run order → Check & save.
5. **Edit direction/branch:** Connected path → Edit link → Remove/keep; or Add branch → Valve C → Two paths → Branch run order → Saved.
6. **Edit activation steps:** Run order → Add step → Wait / Motor / Valve / Safe stop. Reorder → Invalid order → Fix the order.
7. **Schedule and recover:** Schedules → New → North beds → Time → Review → Conflict → Move to 6:30 AM → Save → Schedule list. Detail → Pause → Resume or Delete.
8. **Inspect an alert:** Alerts → Valve B fault → Mark as seen → Seen but unresolved. Acknowledgement never claims the fault is cleared.

## Motor and valve behaviour

The prototype illustrates the intended hardware contract:

- Starting: request valve open → verify open feedback → request motor start → verify motor-running feedback.
- Stopping: request motor off → verify motor-off feedback → request valve close → verify closed feedback.
- A running motor prevents an individual valve-close action.
- A valve timeout blocks motor start.
- An unconfirmed motor stop keeps the valve open and displays **State unknown** with on-site stop guidance.
- An offline controller exposes no active remote start/close control.

The timed prototype transitions simulate successful device confirmations. They are **not** production control logic: elapsed time alone must never count as actual feedback. Readings and run history are illustrative. A saved Figma prototype cannot operate devices.

## Scope of interactivity

This is a linked screen prototype, not a working mobile application. Equipment selection, connection direction, branching, duration changes and schedule changes are represented by prepared states. Form values are examples rather than live text inputs. Arbitrary freeform dragging, unrestricted graph editing, real QR scanning and real authentication belong to the later implementation. The Figma builder represents physical connection arrows with editable vector/shape nodes and uses tap-based port selection for the farmer journey.

## Files

- `manifest.json` + `code.js`: ready-to-import native Figma plugin.
- `AgroThulir-Preview.html`: self-contained clickable offline preview.
- `design.js`: single source for screen content, icons, routes and simulated feedback.
- `figma-runtime.js`: native Figma layout/component/prototype renderer.
- `preview-runtime.js` + `preview.css`: offline preview renderer and styles.
- `SCREEN-INVENTORY.md`: full list of screen states.
- `validation.json`: local preview verification results.

Native Figma verification remains the final outstanding check because of the account tool limit. Local preview screenshots and tests do not prove exact native font metrics or Figma Present-mode behaviour.
