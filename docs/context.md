# Current Context (Snapshot)

## Workspace & Git
- **Workspace Path**: `U:\powerTrack`
- **Git Branch**: `dev-anadi` (pushed to origin `https://github.com/fairuz-anadi/powerTrack`)

## Backend Service
- **Location**: `U:\powerTrack\backend`
- **Node Runtime**: Installed at `U:\Softwares\Node.js`
- **Status**: Running at `http://localhost:3000` (listening on `0.0.0.0`)
- **Ingestion & Query Endpoints**:
  - `POST /api/readings` — Ingest sensor readings (voltage, current, power_watts)
  - `GET /api/readings` — Fetch recent readings with limit
  - `GET /api/readings/latest` — Fetch most recent reading
  - `GET /api/readings/range` — Range query filtering
  - `GET /api/readings/health` — Health check endpoint
  - `GET /api/predictions/next-day` — Forecast next 24-hour kWh consumption
  - `GET /api/predictions/peak-hours` — Hour-by-hour peak demand calculation
  - `POST /api/detect/anomaly` — Z-score anomaly detection check
  - `GET /api/bill-estimate` — Monthly cost estimate calculation
  - `GET /api/recommendations` — AI recommendation list
  - `POST /api/devices` — Device registration
  - `GET /api/carbon-footprint` — Phase 6.1: Carbon emissions tracking
  - `GET /api/detect/fault-risk` — Phase 6.2: Overcurrent & electrical fire risk evaluation
  - `POST /api/simulate/solar` — Phase 6.3: Solar & battery what-if simulation
  - `GET /api/devices/relay` & `POST /api/devices/relay` — Phase 7: Smart relay automation & ESP32 polling
- **Active Storage**: `backend/readings.log` fallback (stores readings when `DATABASE_URL` is unconfigured)
- **Database Schema**: `backend/db_schema.sql` (ready for PostgreSQL / Supabase)

## Frontend Application
- **Location**: `U:\powerTrack\frontend`
- **Status**: Running at `http://localhost:5173` / `http://192.168.0.203:5173` (Vite background process)
- **Design System**: High-contrast, modern executive light-mode theme (`Plus Jakarta Sans` & `Inter`).
- **6 Interactive Views**:
  1. **Overview Home**: Executive Hero Banner, Grid Efficiency KPI, 4 Top Metric Cards, Real-time SVG Power Curve, Peak Hours Widget, and AI Insights snippet.
  2. **Live Monitoring**: Real-time gauge metrics (Active Power, Voltage, Current, Power Factor), stream controls, and filterable telemetry logs.
  3. **AI Analytics & Predictions**: 24h consumption forecast, Isolation Forest anomaly score & fault risk framing, Carbon footprint tracker (kg CO₂ emissions), and interactive **Solar & Battery "What-If" Simulator**.
  4. **Insights & Actions**: Prioritized AI recommendations center with auto-optimize relay simulation triggers and dismiss options.
  5. **IoT Devices & Grid Control**: Smart grid inventory list, Relay Remote Power Control toggle (`POST /api/devices/relay`), and node registration form.
  6. **Cost & Tariff Reports**: Utility tariff rate slider ($/kWh), daily consumption & monthly bill estimator.
- **Proxy Setup**: `frontend/vite.config.js` routes all `/api` traffic directly to `http://127.0.0.1:3000`.

## Hardware & Simulation
- **Wokwi ESP32 Project**: https://wokwi.com/projects/473531909019164673

## Alignment Status
- **Alignment with Overview and Phased Plan**: ✅ Fully aligned across all Phases 0 through 7.

Last updated: 2026-08-29T07:01:00+06:00
