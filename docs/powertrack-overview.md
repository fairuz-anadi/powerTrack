# Project Specification: PowerTrack — AI-Powered Smart Energy Grid

## Purpose of This Document
This document describes the full scope, architecture, stack, and build plan for "PowerTrack," an AI-powered smart energy grid system. It is written so that any AI agent (coding assistant, planning agent, or automation tool) can understand the project context and assist with development, debugging, documentation, or planning without needing additional background.

---

## 1. Project Overview

**Name:** PowerTrack

**Tagline:** AI-powered electricity monitoring, prediction, and savings for the home.

**Type:** Hybrid hardware + software + AI/ML project (IoT + Web Dashboard + Machine Learning)

**Goal:** Build an intelligent energy management system that monitors electricity usage in real time, predicts future consumption and demand, detects abnormal usage patterns, estimates monthly bills, and recommends (or automatically performs) energy-saving actions.

**Context:** Built as a showcase project for a university CSE carnival/exhibition. Needs to be technically credible, visually demonstrable, and feasible to build within a limited student timeline.

---

## 2. Problem Statement

Most households and small businesses have no visibility into real-time electricity consumption. This leads to:
- Unexpected high bills
- Energy waste during peak demand hours
- No early warning when appliances draw abnormal power (potential fault/fire risk)
- No proactive way to reduce consumption before the bill arrives

This project solves that by combining live sensor data with AI-driven prediction and recommendations, displayed on a web dashboard, with optional automated control of devices.

---

## 3. System Architecture / Data Flow

```
[IoT Sensors] → [ESP32] → [Node.js API] → [SQL Database]
                                   ↓
                        [Python ML Microservice]
                                   ↓
                        [React Dashboard] → [Recommendations & Alerts]
                                   ↓ (optional)
                        [Command back to ESP32 → Relay control]
```

Step-by-step:
1. **Sensing:** A PZEM-004T sensor measures real-time voltage, current, and power on the electrical line.
2. **Data Collection:** An ESP32 reads sensor values continuously and sends them over WiFi via HTTP to the Node.js backend.
3. **Storage:** The Node.js backend writes each reading into the SQL database.
4. **AI Processing:** The Node.js backend calls a separate Python ML microservice (internal API) whenever it needs a prediction, anomaly check, or recommendation. The Python service reads historical data from SQL, runs its models, and returns results as JSON.
5. **Presentation:** The React dashboard fetches live readings + AI results from the Node.js API and displays graphs, predictions, alerts, and recommendations.
6. **Action (optional):** The Node.js backend can send a control command back to the ESP32, which triggers the smart relay to cut power to non-essential devices during predicted peak hours.

---

## 4. Finalized Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Hardware | ESP32 | Reads sensors, sends data, receives control commands |
| Sensor | PZEM-004T | Measures voltage, current, power |
| Actuator | Smart Relay Module | Enables remote/automatic device ON-OFF control |
| Firmware | Arduino / C++ | Runs on ESP32 |
| Backend | Node.js + Express | Main REST API — handles data ingestion, serves dashboard, talks to DB and ML service |
| Database | PostgreSQL | Stores readings, predictions, alerts, device logs |
| ML Service | Python (Flask/FastAPI) + scikit-learn + TensorFlow/PyTorch | Separate microservice for Random Forest, Isolation Forest, LSTM; called internally by Node.js over HTTP |
| Frontend | React | Dashboard: live graphs, predictions, alerts, recommendations |
| Communication | HTTP/WiFi (ESP32 ↔ Node.js), HTTP (Node.js ↔ Python ML service) | MQTT optional upgrade if HTTP polling proves too slow/heavy |

**Why this split:** Node.js is not suited for running ML models directly, and Python's ML ecosystem (scikit-learn, TensorFlow/PyTorch) is far more mature. Keeping them as two services (Node.js main backend + Python ML microservice) lets each part use the best tool for its job while staying simple to build and demo.

---

## 5. Core Features

| Feature | Description | Priority |
|---|---|---|
| Real-time electricity monitoring | Live dashboard graphs of current voltage, current, and power draw | Must-have |
| Next-day consumption prediction | ML model forecasts tomorrow's total electricity usage | Must-have |
| Peak demand prediction | Model predicts time window(s) of highest expected demand | Should-have |
| Abnormal usage detection | Anomaly detection flags unusual spikes/drops | Should-have |
| Monthly bill estimation | Predicted consumption converted into an estimated bill using tariff rate | Should-have |
| AI-based energy-saving recommendations | Rule-based text generated from model outputs, e.g., "High demand expected 7–10 PM, turning off non-essential devices could save ~15%" | Must-have |
| Automated device control | System auto-triggers relay to cut power during predicted peak hours | Nice-to-have / stretch |

---

## 5B. Novelty / Differentiating Features

These features are what push the project beyond a standard "smart meter + prediction" build and give it a stronger, more original pitch. Add as many as time allows, roughly in this priority order.

| Feature | Description | Effort | Impact |
|---|---|---|---|
| Carbon footprint tracking | Convert predicted/actual kWh into estimated CO₂ emissions using a grid emission factor; show "kg CO₂ saved this week" | Low | High — strong sustainability narrative |
| Fault / fire-risk framing for anomalies | Reframe anomaly detection specifically around patterns linked to electrical faults (sustained overcurrent, voltage sag under load) as a safety feature, not just a savings one | Low | High — safety angle resonates emotionally with judges |
| Solar/battery "what-if" simulator | Let the user simulate adding a solar panel + battery and show projected savings using existing consumption data (pure software, no new hardware) | Medium | High — big perceived value, no hardware risk |
| Appliance-level load disaggregation (NILM) | Use power signature/current spikes to guess which appliance is running (fridge vs. AC vs. kettle) from a single sensor, even with simple rule-based thresholds | Medium | High — genuinely research-adjacent, very demoable |
| Neighborhood/peer comparison | "Your usage is 20% higher than similar homes nearby" using anonymized synthetic comparison data; gamifies saving | Medium | Medium — good for dashboard engagement |
| Natural-language Q&A on the dashboard | User can ask "why was my bill high last week?" and get a conversational answer generated from prediction/anomaly data | Medium | High — very on-trend, strong live-demo moment |
| Demand-response / multi-home simulation | Simulate several households (like the one being monitored) coordinating to reduce a city-wide peak load, reinforcing the "grid" framing in the project name | Medium-High | Medium-High — elevates story from single home to grid scale |
| Edge AI on ESP32 (TinyML) | Run a lightweight anomaly-detection model directly on the ESP32 so it still works without WiFi/cloud | High | High — strong technical talking point ("works offline") |
| Reinforcement learning automation | Replace rule-based relay control with an RL agent that learns an optimal on/off schedule balancing cost vs. comfort | High | High but risky — only attempt if core system is solid and time remains |

**Recommended minimum set for a strong pitch:** Carbon footprint tracking + fault/safety framing + solar/battery simulator. All three are software-only, build on data already being collected, and don't add hardware risk.

---

## 6. AI / Machine Learning Layer

| Task | Model | Input | Output |
|---|---|---|---|
| Next-day consumption forecast | LSTM or Random Forest Regressor | Historical time-series readings (hourly/daily aggregates) | Predicted kWh for next 24 hours |
| Peak demand prediction | Same forecasting model at hourly resolution | Historical hourly readings | Hour(s) of expected peak load |
| Anomaly detection | Isolation Forest (fallback: statistical z-score threshold) | Recent readings vs. learned baseline | Flag + timestamp of abnormal reading |
| Bill estimation | Deterministic calculation (not ML) | Predicted kWh × tariff rate | Estimated bill amount |
| Recommendation generation | Rule-based templates (not a separate ML model) | Prediction + anomaly outputs | Human-readable suggestion string |

**Data note:** Models need historical consumption data. If real logged data is limited, use a mix of short-term real sensor logs plus realistic synthetic/augmented data for training — and be transparent about this when presenting to judges.

**Technical depth additions (low effort, high credibility):**
- Report model accuracy metrics (RMSE, MAE for forecasting; precision/recall for anomaly detection) rather than just claiming "it works" — shows proper evaluation
- Document how limited training data was handled (e.g., synthetic augmentation method used) — honesty here builds more trust with judges than hiding it
- Keep a simple train/test split or walk-forward validation for the forecasting model so results aren't just memorized on training data

---

## 7. Suggested SQL Schema (Starting Point)

```sql
-- Raw sensor readings
CREATE TABLE readings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    voltage FLOAT NOT NULL,
    current FLOAT NOT NULL,
    power_watts FLOAT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI predictions (daily/hourly forecasts)
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    prediction_type VARCHAR(30) NOT NULL, -- 'next_day_consumption', 'peak_demand', 'bill_estimate'
    predicted_value FLOAT NOT NULL,
    predicted_for TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Anomaly alerts
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20), -- 'low', 'medium', 'high'
    detected_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Devices connected via relay (for automation feature)
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    relay_pin VARCHAR(20),
    is_essential BOOLEAN DEFAULT TRUE,
    current_state VARCHAR(10) DEFAULT 'on' -- 'on' or 'off'
);
```

This is a starting point — adjust field types/names once real requirements are clearer.

---

## 7B. Dashboard Enhancements (Polish Layer)

Beyond the core charts and alerts, these additions make the dashboard feel more complete and judge-friendly:

- **Cost breakdown by time-of-day** — split predicted cost into peak vs. off-peak periods, if the local tariff structure supports it
- **Savings streak / comparison view** — e.g., "20% lower than last week" to make progress visible and rewarding
- **Mobile-responsive layout** — judges often walk around with tablets/phones; the dashboard should work in a browser at smaller widths
- **Carbon footprint widget** — pairs with the novelty feature above (kg CO₂ saved)
- **Recommendation cards** — visually distinct cards for each AI suggestion, rather than plain text, so they stand out during a live walkthrough

---

## 7C. Demo Safety & Reliability

Live hardware + AI demos are the highest-risk part of any exhibition. Plan for failure explicitly:

- **Backup demo video** — record a full working run-through in advance in case live WiFi/hardware fails during judging
- **Synthetic/replay mode** — build a toggle in the backend that replays realistic pre-recorded sensor data into the pipeline if live sensors misbehave, so the dashboard and AI features can still be demonstrated end-to-end
- **Safe automation testing** — test relay automation only on a small controlled load (fan/LED), never on real home wiring
- **Offline fallback** — if WiFi is unreliable at the venue, have a local hotspot or ESP32-to-laptop direct connection as backup

---

## 7D. Pitch & Presentation Materials

To make sure the technical work lands well with judges:

- **One-page architecture diagram/poster** — visual summary of the system flow (can be generated from Section 3)
- **Short slide deck** — Problem → Solution → Architecture → AI Approach → Impact → Demo
- **Concrete results, even small-scale** — e.g., "Reduced simulated household usage by X% over Y days of testing" carries more weight than general claims
- **Clear one-line pitch** — a single sentence describing the project for judges walking past quickly

---

## 8. Build Plan / Phased Roadmap

**Phase 1 — Foundation (Week 1)**
- Set up ESP32 + PZEM-004T, confirm accurate sensor readings via serial monitor
- Set up PostgreSQL database and `readings` table
- Build minimal Node.js API endpoint to receive and store readings from ESP32
- Confirm ESP32 → Node.js → SQL pipeline works end-to-end

**Phase 2 — Dashboard MVP (Week 2)**
- Build React dashboard skeleton
- Connect dashboard to Node.js API to show live readings (basic line chart)
- Deploy backend + frontend somewhere accessible (or run locally for demo)

**Phase 3 — AI Layer (Week 2–3)**
- Collect/generate a working dataset (real short-term logs + synthetic data if needed)
- Build Python ML microservice with one working model first: next-day consumption prediction
- Connect Node.js → Python microservice → display prediction on dashboard
- Add anomaly detection (Isolation Forest) once forecasting works

**Phase 4 — Polish Features (Week 3–4)**
- Add bill estimation calculation
- Add rule-based recommendation text generation
- Improve dashboard UI/UX (charts, alerts panel, recommendation cards — see Section 7B)

**Phase 5 — Novelty Features (if time allows, Week 4)**
- Add carbon footprint tracking
- Add fault/fire-risk framing to anomaly alerts
- Add solar/battery what-if simulator
- Attempt further novelty features from Section 5B in priority order if time remains

**Phase 6 — Stretch Goal: Automation (if time allows)**
- Implement relay automation triggered by peak-hour prediction
- Test only on a small safe demo load (fan/LED), not real home wiring

**Phase 7 — Demo Prep**
- Build synthetic/replay mode as a fallback (Section 7C)
- Record a full backup demo video in case of live WiFi/hardware failure
- Prepare pitch materials: architecture poster, slide deck, one-line pitch (Section 7D)
- Confirm with organizers which judging category (hardware vs. software) applies

---

## 9. Known Risks / Open Questions

- Limited real historical data for training ML models — may require synthetic data augmentation
- Live hardware demos (WiFi + sensor + relay) are prone to failure — mitigated by backup video and synthetic/replay mode (Section 7C)
- Overall scope may be too large for the timeline — Phase 1–4 (must-have + should-have features) should be treated as the real minimum target; Phases 5–6 are optional but strongly boost novelty
- Judging category (hardware vs. software) needs clarification with organizers since this is a hybrid project

---

## 10. How an AI Agent Should Use This Document

When assisting with this project, an AI agent should:
- Treat the architecture in Section 3 and stack in Section 4 as the source of truth
- Follow the phased roadmap in Section 8 — prioritize whichever phase the user says they're currently on
- Prioritize must-have and should-have features (Section 5) before novelty (5B), polish (7B), or stretch (Phase 6) features
- Use the schema in Section 7 as a starting point when writing backend/database code, adjusting as needed
- Flag any suggestion that conflicts with constraints in Section 9 (e.g., assuming large real datasets are available when only limited data exists)
- Assume this is a student exhibition project, not a production system — favor working, demonstrable simplicity over enterprise-grade robustness
- When asked for "something impressive to add," pull from Section 5B (Novelty Features) rather than proposing entirely new ideas outside this document
