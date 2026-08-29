# PowerTrack — Detailed Phased Execution Plan

## Purpose of This Document
This document breaks the PowerTrack project into detailed, sequential phases — from hardware design in simulation (Wokwi) through to final demo preparation. Each phase includes granular tasks, technical specifics, testing steps, common pitfalls, and clear exit criteria. It complements the main project specification (`smart-energy-grid-project-spec.md`), which covers architecture, stack, and feature design. This document is the execution checklist — any AI agent or team member should be able to open it, find the current phase, and know exactly what to do next.

---

## Phase 0 — Hardware Design & Simulation (Wokwi)

**Goal:** Design and validate the ESP32 + sensor + relay circuit virtually before touching real hardware, so wiring mistakes and firmware bugs are caught early and cheaply, and so software work can start even before physical parts arrive.


### 0.1 Environment Setup
- Create a free account at wokwi.com
- Start a new project and select **ESP32 DevKit V1** as the board (most common ESP32 dev board, well supported in Wokwi)
- Familiarize the team with the Wokwi editor: `diagram.json` (circuit/wiring), `sketch.ino` (firmware code), and the Serial Monitor panel

### 0.2 Simulating the Sensor Input
Wokwi does not have a native PZEM-004T component, so choose one of these approaches:
- **Approach A (recommended for early logic testing):** Use a **potentiometer** wired to an ESP32 ADC pin (e.g., GPIO 34) to simulate a variable analog reading standing in for voltage/current. This lets you test the read → process → send pipeline without worrying about exact sensor protocol yet.
- **Approach B (more realistic):** Write firmware that generates **mock serial data matching the PZEM-004T Modbus response format**, so the parsing logic you'll need for the real sensor can be built and unit-tested now. This is more work but de-risks Phase 1 significantly.
- Decide as a team which approach to use based on how much time is available — Approach A is faster to get moving, Approach B saves time later.

### 0.3 Simulating the Relay/Actuator
- Add a **relay module** component in Wokwi (or substitute an LED if the relay component behaves oddly in simulation) wired to a GPIO output pin (e.g., GPIO 25)
- Confirm the relay/LED can be toggled from firmware based on a simple test condition (e.g., toggle every 5 seconds, or toggle based on simulated power threshold)

### 0.4 Firmware Skeleton (Arduino/C++)
Write and test firmware that does the following, step by step:
1. **Boot and Serial init** — confirm `Serial.begin(115200)` works and prints a startup message
2. **Sensor read loop** — read the simulated sensor value every N seconds (start with N=5 for testing, will tune later)
3. **Print to Serial Monitor** — output readings in a clear format, e.g., `Voltage: 220.5V | Current: 2.1A | Power: 463W`
4. **WiFi connection logic** — Wokwi supports simulated WiFi for ESP32; write connection code with:
   - Connection attempt with timeout
   - Retry logic if connection fails
   - A visible Serial message confirming connection status
5. **Relay control logic** — toggle relay/LED based on a placeholder condition (e.g., `if (power > 500) turnOffRelay();`) — this is just to prove the control pathway works; real logic comes later from AI predictions
6. **HTTP request stub** — write (but don't need to fully test yet, since Wokwi's simulated WiFi may not reach real external servers) the code structure for sending an HTTP POST with sensor data, so it's ready to point at the real backend in Phase 2

### 0.5 Documenting the Pin Mapping
Finalize and record the exact GPIO assignments so real hardware wiring in Phase 1 is unambiguous:

| Component | ESP32 Pin | Notes |
|---|---|---|
| PZEM-004T RX | GPIO 16 (UART2 RX) | PZEM uses Modbus over serial (UART), not analog |
| PZEM-004T TX | GPIO 17 (UART2 TX) | |
| Relay IN | GPIO 25 | Digital output, active HIGH or LOW depending on relay module — confirm datasheet |
| Status LED | GPIO 2 | Onboard LED on most ESP32 dev boards, useful for connection status indication |
| (Optional) Second relay for automation demo | GPIO 26 | If demoing 2 devices being controlled |

**Important note:** Real PZEM-004T communicates via UART/Modbus, not a simple analog read — this is different from the potentiometer simulation in 0.2. Flag this clearly so the team doesn't assume the simulated analog approach will directly translate; the real Phase 1 firmware will need a Modbus/PZEM library (e.g., `PZEM004Tv30` Arduino library).

### 0.6 Testing Checklist for Phase 0
- [ ] Firmware compiles without errors in Wokwi
- [ ] Serial monitor shows readable, correctly formatted sensor values
- [ ] Values update at the expected interval
- [ ] Relay/LED responds correctly to the test condition
- [ ] WiFi connection logic runs and logs status (connected/failed/retrying)
- [ ] Pin mapping table is finalized and shared with whoever is sourcing/wiring real components

### 0.7 Common Pitfalls
- Assuming the potentiometer simulation directly represents PZEM-004T's data format — it doesn't; only use it to test the read-loop structure, not final parsing logic
- Forgetting that Wokwi's simulated WiFi may not actually reach external internet servers — don't block Phase 0 completion on a real HTTP round-trip working; that's tested properly in Phase 1/2
- Using a GPIO pin that's input-only (e.g., GPIO 34–39 are input-only ADC pins on ESP32) for an output like the relay — double check pin capabilities before finalizing the mapping

**Exit criteria (move to Phase 1 when):**
- All items in the Phase 0.6 testing checklist are complete
- Pin mapping is documented and shared
- Team understands the real PZEM-004T will require UART/Modbus communication, not analog reads

---

## Phase 1 — Real Hardware Bring-Up

**Goal:** Move from simulation to physical hardware, confirming the real sensor produces accurate readings and the relay reliably switches a real load.


### 1.1 Procurement
- Order/acquire: ESP32 DevKit board, PZEM-004T module (with current transformer/CT clamp if not built-in), relay module rated for the intended load voltage/current, breadboard + jumper wires, USB cable for ESP32 programming
- Double-check PZEM-004T variant (v3.0 is most common and has good Arduino library support) — confirm before ordering

### 1.2 Wiring
- Wire according to the Phase 0 pin mapping
- PZEM-004T: connect RX/TX to ESP32 UART pins (cross-connected: PZEM TX → ESP32 RX, PZEM RX → ESP32 TX), power PZEM module per its datasheet (usually 5V)
- **Safety note:** the PZEM-004T's CT clamp/current sensing side interacts with live household wiring — this must be done carefully, ideally by someone with electrical wiring experience, with the circuit powered off during wiring changes
- Relay: connect control pins to ESP32 GPIO, connect load side to the test device (fan/LED), never to unsupervised live home wiring during development

### 1.3 Firmware Migration
- Install the PZEM004T Arduino library (e.g., `PZEM004Tv30` by olehs, available via Arduino Library Manager)
- Replace the Phase 0 simulated sensor read logic with real library calls to read voltage, current, power, energy
- Keep the same Serial output format from Phase 0 for consistency
- Flash firmware to the real ESP32 via USB

### 1.4 Calibration & Accuracy Testing
- Compare PZEM-004T readings against a known reference (e.g., a plug-in wattmeter, or a known-wattage device like a labeled light bulb/heater)
- Record a short table of expected vs. measured values to confirm accuracy is within a reasonable margin (a few percent)
- If consistently off, check PZEM-004T calibration options (some libraries support calibration offsets)

### 1.5 Relay Load Testing
- Confirm relay physically switches the test load (fan/LED) reliably on command from firmware
- Test rapid on/off toggling doesn't cause instability or resets on the ESP32 (relay switching can cause electrical noise — add flyback diode/snubber if needed per relay module datasheet)

### 1.6 WiFi Stability Testing
- Confirm ESP32 connects to the real WiFi network used at the workspace/venue
- Run an extended test (30+ minutes) logging connection drops, if any
- Implement auto-reconnect logic if not already present from Phase 0

### 1.7 Testing Checklist for Phase 1
- [ ] Real sensor readings match reference measurements within acceptable margin
- [ ] Relay reliably switches test load on/off on command
- [ ] ESP32 maintains stable WiFi connection over 30+ minute test
- [ ] Auto-reconnect logic works if WiFi drops
- [ ] Firmware handles sensor read errors gracefully (e.g., PZEM not responding) without crashing

**Exit criteria (move to Phase 2 when):** all Phase 1.7 checklist items pass.

---

## Phase 2 — Backend Foundation (Node.js + PostgreSQL)

**Goal:** Get real sensor data flowing reliably from ESP32 into a working, queryable database.


### 2.1 PostgreSQL Setup
- Install PostgreSQL locally (or set up a cloud instance, e.g., Supabase/Railway/Render free tier, for easier team access and eventual deployment)
- Create the `powertrack` database
- Run the schema from the main spec doc to create `readings`, `predictions`, `alerts`, and `devices` tables
- Verify tables exist with `\dt` in `psql` or a GUI tool (e.g., pgAdmin, TablePlus)

### 2.2 Node.js/Express API Setup
- Initialize a Node.js project (`npm init`), install `express`, `pg` (PostgreSQL client), `dotenv` (for environment variables), `cors`
- Set up a `.env` file for DB connection string — never commit credentials to version control
- Build project structure: `/routes`, `/controllers`, `/db`, `server.js` (or `index.js`)

### 2.3 Core Endpoints
Build and test these endpoints one at a time:
- `POST /api/readings` — receives `{ device_id, voltage, current, power_watts }` from ESP32, inserts into `readings` table, returns success/failure
- `GET /api/readings` — returns recent readings (support a `?limit=` query param), used by the dashboard
- `GET /api/readings/latest` — returns just the most recent reading, useful for a "live" widget
- `GET /api/readings/range?start=&end=` — returns readings in a time range, useful for charts and for feeding the ML service later

### 2.4 Connect ESP32 to the Real Backend
- Update ESP32 firmware's HTTP POST stub (from Phase 0.4) to point at the real Node.js endpoint (use the machine's local IP address if testing on the same network, e.g., `http://192.168.1.X:3000/api/readings`)
- Test with the ESP32 sending real readings and confirm they appear in PostgreSQL
- Add basic error handling on both ends: what happens if the request fails (ESP32 should retry or log, not crash)

### 2.5 Data Validation & Rate Limiting
- Add basic input validation on `POST /api/readings` (reject clearly invalid values, e.g., negative voltage)
- Decide on a sensible reading interval (e.g., every 5–10 seconds) to avoid flooding the database — this can be tuned later

### 2.6 Testing Checklist for Phase 2
- [ ] ESP32 → Node.js → PostgreSQL pipeline works end-to-end with real sensor data
- [ ] `GET /api/readings` returns correctly formatted JSON
- [ ] API handles malformed/missing data gracefully (returns proper error codes, doesn't crash)
- [ ] Database accumulates readings correctly over an extended test run (e.g., 1+ hour)

**Exit criteria (move to Phase 3 when):** all Phase 2.6 checklist items pass, and there's at least a few hours of real accumulated reading data in the database (useful for Phase 4 model training later).

---

## Phase 3 — Dashboard MVP (React)

**Goal:** Visualize live data so the system becomes demonstrable, even before AI features are added.


### 3.1 Project Setup
- Scaffold a React app (e.g., with Vite for faster dev experience)
- Install a charting library (e.g., Recharts or Chart.js) and an HTTP client (e.g., `axios` or native `fetch`)
- Set up basic routing/layout structure even if single-page for now

### 3.2 Live Data Display
- Build a component that polls `GET /api/readings/latest` every few seconds and displays current voltage/current/power as large, readable numbers
- Build a line chart component that fetches `GET /api/readings?limit=50` (or a time range) and plots power over time
- Add loading and error states (what shows if the API is unreachable)

### 3.3 Layout Skeleton
- Header with project name/logo (PowerTrack)
- Main live chart section
- Placeholder cards/sections for: predictions, alerts, recommendations, bill estimate (to be filled in Phase 4–5)
- Basic responsive CSS so it doesn't break on tablet/phone widths

### 3.4 Testing Checklist for Phase 3
- [ ] Dashboard shows real-time data updating from actual sensor readings
- [ ] Chart correctly displays historical trend, not just the latest point
- [ ] Layout doesn't visually break at common screen widths (test at ~375px, ~768px, ~1440px)
- [ ] Dashboard handles API downtime gracefully (shows a message, doesn't crash white-screen)

**Exit criteria (move to Phase 4 when):** all Phase 3.4 checklist items pass.

---

## Phase 4 — AI Layer (Python Microservice)

**Goal:** Add the core AI/ML features on top of the data pipeline — this is the technical heart of the project.


### 4.1 Python Microservice Setup
- Initialize a Python project with Flask or FastAPI (FastAPI recommended for automatic docs and easier JSON handling)
- Install `scikit-learn`, `pandas`, `numpy`; add `tensorflow` or `torch` only if pursuing LSTM (otherwise Random Forest alone is sufficient and simpler to get working reliably)
- Set up a `psycopg2` or `sqlalchemy` connection to read from the same PostgreSQL database

### 4.2 Data Preparation
- Pull accumulated readings from Phase 2/3 testing
- Aggregate raw readings into hourly/daily summaries (models generally work better on aggregated data than raw noisy per-second readings)
- If real data is insufficient (likely, given short collection time), generate synthetic data:
  - Base synthetic daily/hourly patterns on typical household usage curves (higher usage morning and evening, lower overnight)
  - Add controlled random noise so it isn't perfectly predictable
  - Clearly label/document which data is synthetic vs. real, for both training integrity and honesty in the pitch

### 4.3 Next-Day Consumption Prediction
- Start with **Random Forest Regressor** (simpler, faster to get working than LSTM, and sufficient for a demo)
- Feature engineering: hour of day, day of week, previous day's total consumption, rolling average of past N days
- Train/test split (or walk-forward validation for time series) — do not evaluate only on training data
- Record evaluation metrics: RMSE, MAE
- Wrap in an endpoint: `GET /predict/next-day` returning predicted kWh for tomorrow
- **If time allows:** attempt an LSTM version afterward and compare — but only after the Random Forest version works end-to-end, so there's always a working fallback

### 4.4 Peak Demand Prediction
- Reuse the same model approach at hourly resolution instead of daily
- Endpoint: `GET /predict/peak-hours` returning the hour(s) of expected highest demand

### 4.5 Anomaly Detection
- Implement **Isolation Forest** trained on "normal" historical readings
- Test by deliberately feeding an obviously abnormal value (e.g., a simulated spike) and confirming it's flagged
- Endpoint: `POST /detect/anomaly` (or a scheduled check) that returns whether the latest reading(s) are anomalous
- **Fallback if Isolation Forest proves unreliable with limited data:** implement a simple statistical z-score threshold (flag readings more than N standard deviations from the recent mean) — less impressive-sounding but more reliable with small datasets, and still legitimate to present

### 4.6 Connecting Node.js to the Python Service
- Node.js backend calls the Python microservice's endpoints internally (e.g., `http://localhost:8000/predict/next-day`) whenever the dashboard requests predictions
- Add a Node.js endpoint layer: `GET /api/predictions/next-day`, `GET /api/predictions/peak-hours`, `GET /api/alerts` — these proxy to Python and also store results in the `predictions`/`alerts` tables for history
- Display results on the React dashboard (fill in the placeholder cards from Phase 3.3)

### 4.7 Testing Checklist for Phase 4
- [ ] Next-day prediction endpoint returns a reasonable value (not wildly off from recent actual consumption)
- [ ] Evaluation metrics (RMSE/MAE) are recorded and documented for the pitch
- [ ] Anomaly detection correctly flags a deliberately injected abnormal reading
- [ ] Anomaly detection does NOT flag normal variation as anomalous (test with typical fluctuating data)
- [ ] Dashboard correctly displays prediction and anomaly results from the live pipeline (not hardcoded)

**Exit criteria (move to Phase 5 when):** all Phase 4.7 checklist items pass, with at least the next-day prediction and anomaly detection features fully working end-to-end on the dashboard.

---

## Phase 5 — Feature Completion (Bill Estimation + Recommendations)

**Goal:** Round out the "should-have" features from the main spec, building directly on Phase 4's outputs.


### 5.1 Bill Estimation
- Determine the local electricity tariff structure (flat rate vs. tiered/slab rate — Bangladesh often uses tiered residential tariffs, worth confirming current rates)
- Implement calculation: predicted monthly kWh (extrapolated from next-day prediction × 30, or better, from an aggregated monthly forecast if time allows) × applicable tariff rate(s)
- Endpoint: `GET /api/bill-estimate`
- Display clearly on dashboard with a breakdown if tiered

### 5.2 Recommendation Generation
- Build rule-based templates that combine prediction + anomaly outputs into human-readable suggestions, e.g.:
  - If peak hour predicted between X–Y with high demand → "High demand expected between {X} and {Y}. Turning off non-essential devices could save approximately {N}%."
  - If anomaly detected → "Unusual power usage detected at {time} — check if a device was left on or may be malfunctioning."
- Endpoint: `GET /api/recommendations`
- Display as distinct cards on the dashboard (not plain text — see Phase 8 for visual polish, but get the content working first here)

### 5.3 Testing Checklist for Phase 5
- [ ] Bill estimate updates when prediction data changes (not static/hardcoded)
- [ ] At least one recommendation is generated and displayed based on real model output
- [ ] Recommendation text reads naturally and isn't confusing/contradictory

**Exit criteria (move to Phase 6 when):** all Phase 5.3 checklist items pass.

---

## Phase 6 — Novelty Features

**Goal:** Add differentiators that make PowerTrack stand out from a standard "smart meter + prediction" project (full list and rationale in Section 5B of the main spec).


### 6.1 Carbon Footprint Tracking (recommended, low effort)
- Find/confirm an appropriate grid emission factor (kg CO₂ per kWh) for the relevant country/region
- Calculate: predicted or actual kWh × emission factor = estimated kg CO₂
- Display as a simple widget: "X kg CO₂ saved this week" (comparing actual vs. a baseline/previous period)

### 6.2 Fault/Fire-Risk Framing (recommended, low effort)
- Extend the anomaly detection output (Phase 4.5) with specific pattern checks: sustained overcurrent beyond a safety threshold, abrupt voltage sag under load
- When these specific patterns are detected, generate a distinctly worded, higher-severity alert (e.g., "⚠️ Potential electrical fault detected — sustained high current draw. Consider inspecting connected devices.")
- Store with `severity = 'high'` in the `alerts` table so it can be visually distinguished on the dashboard

### 6.3 Solar/Battery What-If Simulator (recommended, medium effort)
- Pure software feature — no new hardware required
- Build a simple simulation: given historical consumption data, calculate estimated savings if a solar panel of a given size (user-input, e.g., 2kW) offset daytime usage, and a battery (user-input capacity) stored excess for evening use
- Use simplified assumptions (documented clearly) rather than a full solar-irradiance model — the point is demonstrating the concept, not perfect accuracy
- Dashboard UI: input fields for panel size/battery capacity, output: estimated % reduction in grid draw and estimated bill savings

### 6.4 Stretch Novelty Features (only if time remains after 6.1–6.3)
- Appliance-level load disaggregation (rule-based thresholds on power jumps)
- Natural-language Q&A on the dashboard (small LLM call summarizing prediction/anomaly data conversationally)
- Neighborhood/peer comparison (using synthetic comparison data)

### 6.5 Testing Checklist for Phase 6
- [ ] Carbon footprint widget shows a plausible, correctly calculated value
- [ ] Fault/fire-risk alerts trigger correctly on injected test patterns and are visually distinct from regular anomaly alerts
- [ ] Solar/battery simulator produces sensible, consistent output when inputs are changed
- [ ] Any stretch features attempted are fully working, not half-finished (better to skip than demo something broken)

**Exit criteria (move to Phase 7 when):** at minimum, features 6.1–6.3 are working; move on regardless of whether 6.4 stretch features were attempted.

---

## Phase 7 — Automation (Stretch Goal)

**Goal:** Close the loop — let the system act on its own predictions, demonstrating full IoT + AI integration.


### 7.1 Automation Logic
- Define a clear trigger condition, e.g., "if predicted demand in the next hour exceeds threshold X, and the target device is marked non-essential, switch it off"
- Implement this check in the Node.js backend (runs on a schedule, e.g., every 10 minutes, or triggered after each new prediction)
- Node.js sends a command to the ESP32 (e.g., via a simple HTTP endpoint the ESP32 polls, or a lightweight push mechanism)

### 7.2 ESP32-Side Command Handling
- Update firmware to check for pending commands (poll a `GET /api/devices/commands` endpoint periodically) and execute relay changes accordingly
- Log/report back the new device state to confirm the action was taken

### 7.3 Safety Constraints
- Only ever test on a small, clearly labeled demo load (fan/LED) — never on real, unsupervised home wiring
- Add a manual override/kill switch (physical button or dashboard toggle) to immediately return control to manual mode during the live demo, in case automation misbehaves

### 7.4 Testing Checklist for Phase 7
- [ ] Automation trigger correctly fires based on real prediction data (not just a hardcoded test)
- [ ] Relay reliably responds to the AI-triggered command within a reasonable delay
- [ ] Manual override successfully interrupts automation when triggered
- [ ] System behaves safely and predictably during repeated on/off cycling tests

**Exit criteria (move to Phase 8 when):** all Phase 7.4 checklist items pass, OR the team decides to skip this stretch phase entirely due to time constraints (acceptable — see Known Risks in main spec).

---

## Phase 8 — Dashboard Polish

**Goal:** Make the dashboard feel complete, coherent, and professional for judges — this phase is about perception and usability, not new functionality.


### 8.1 Visual Polish
- Consistent color scheme, typography, and spacing across all dashboard sections
- Replace plain-text recommendation/alert displays with styled cards (icon + short headline + detail text)
- Add subtle loading states/animations so the dashboard doesn't feel static or broken during data fetches

### 8.2 Additional Dashboard Sections
- Cost breakdown by time-of-day (peak vs. off-peak), if tariff structure supports it
- Savings streak/comparison view (e.g., "20% lower than last week")
- Carbon footprint widget prominently placed (from Phase 6.1)

### 8.3 Responsiveness Pass
- Full test across desktop, tablet, and phone-sized viewports
- Confirm charts resize properly and text doesn't overflow on small screens

### 8.4 Testing Checklist for Phase 8
- [ ] Dashboard looks visually coherent, not like disconnected feature additions
- [ ] All sections are readable and functional across screen sizes
- [ ] No obvious placeholder text, lorem ipsum, or debug output remains visible anywhere

**Exit criteria (move to Phase 9 when):** all Phase 8.4 checklist items pass.

---

## Phase 9 — Demo Reliability & Pitch Prep

**Goal:** De-risk the live demo and prepare presentation materials — this phase is as important as the technical build for actually winning.


### 9.1 Synthetic/Replay Fallback Mode
- Build a toggle (backend flag or dashboard button, ideally hidden/admin-only) that switches the system from live ESP32 data to replaying a pre-recorded, realistic dataset through the same pipeline
- Test that predictions, alerts, and recommendations all still work correctly when running in replay mode
- This is the single highest-value risk mitigation for the whole project — prioritize it

### 9.2 Backup Demo Video
- Record a full, clean run-through of the entire system working live (real hardware, real dashboard, all features)
- Keep it on a laptop locally (not dependent on internet access at the venue) and also as a backup on a phone/USB drive

### 9.3 Presentation Materials
- **One-page architecture poster** — visual diagram of the system flow (based on Section 3 of the main spec)
- **Slide deck** structured as: Problem → Solution Overview → Architecture → AI Approach & Results → Novelty Features → Impact/Results → Live Demo
- **One-line pitch** for judges walking past quickly, e.g., "PowerTrack is an AI system that predicts your electricity usage, catches faults before they become dangerous, and shows you exactly how to cut your bill."
- Include real evaluation numbers from Phase 4 (RMSE/MAE, anomaly detection test results) — concrete metrics build credibility

### 9.4 Logistics
- Confirm with organizers which judging category (hardware vs. software) applies
- Confirm venue WiFi availability/reliability in advance; prepare a mobile hotspot as backup if uncertain
- Assign clear roles for the live demo: who talks, who operates the hardware, who handles the laptop/dashboard

### 9.5 Rehearsal
- Do at least 2 full run-throughs of the live demo as a team, including deliberately testing what happens if something fails (e.g., unplug WiFi mid-demo and switch to replay mode) so the team is comfortable handling it live

### 9.6 Testing Checklist for Phase 9
- [ ] Replay/fallback mode works seamlessly and looks identical to live mode from the dashboard
- [ ] Backup video is recorded, accessible offline, and covers all key features
- [ ] Pitch materials are complete and reviewed by the full team
- [ ] At least 2 full rehearsals completed, including a simulated failure scenario

**Exit criteria:** all Phase 9.6 checklist items pass — project is demo-ready.

---

## Phase Summary Table

| Phase | Focus | Key Output |
|---|---|---|
| 0 | Hardware design in Wokwi | Validated circuit + firmware logic, pin mapping |
| 1 | Real hardware bring-up | Working physical ESP32 + sensor + relay |
| 2 | Backend foundation | ESP32 → Node.js → PostgreSQL pipeline |
| 3 | Dashboard MVP | Live data visualization in React |
| 4 | AI layer | Prediction + anomaly detection working |
| 5 | Feature completion | Bill estimation + recommendations |
| 6 | Novelty features | Carbon tracking, fault framing, solar simulator |
| 7 | Automation (stretch) | AI-triggered relay control |
| 8 | Dashboard polish | Professional, judge-ready UI |
| 9 | Demo & pitch prep | Backup plan + presentation materials |

Treat Phases 0–5 and 9 as the non-negotiable core path. Phases 6–8 (novelty, automation, polish) are flexible and should be trimmed first if the team is short on time.

---

## How an AI Agent Should Use This Document

- Always ask (or infer from context) which phase and which specific sub-step the user is currently working on before generating code or advice
- Do not suggest skipping Phase 0 (Wokwi simulation) even if real hardware is already available — it remains useful for safely testing firmware changes before flashing real devices
- Treat each phase's numbered testing checklist as the definition of done before helping move to the next phase
- When the user is behind schedule, prioritize suggesting cuts from Phases 6–8 (novelty/automation/polish) before ever suggesting cuts to Phases 0–5 or 9 (core functionality and demo safety)
- Cross-reference the main spec (`smart-energy-grid-project-spec.md`) for architecture, schema, and stack details — this document is about sequencing and execution, not technical design
