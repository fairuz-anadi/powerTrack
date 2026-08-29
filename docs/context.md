# Current Context (Snapshot)

## Workspace & Git
- **Workspace Path**: `U:\powerTrack`
- **Git Branch**: `dev-anadi` (pushed to origin `https://github.com/fairuz-anadi/powerTrack`)

## Backend Service
- **Location**: `U:\powerTrack\backend`
- **Node Runtime**: Installed at `U:\Softwares\Node.js`
- **Status**: Running at `http://localhost:3000` (background process)
- **Ingestion & Query Endpoints**: `POST /api/readings`, `GET /api/readings`, `/latest`, `/range`, `/health`, `/predictions/next-day`, `/predictions/peak-hours`, `/detect/anomaly`, `/bill-estimate`, `/recommendations`, `/devices`.
- **Active Storage**: `backend/readings.log` fallback (stores readings when `DATABASE_URL` is unconfigured)

## Frontend Application
- **Location**: `U:\powerTrack\frontend`
- **Status**: Running at `http://localhost:5173` / `http://192.168.0.203:5173` (Vite background process)
- **Typography & Theme**: Executive font hierarchy using `Plus Jakarta Sans` for titles/navigation & `Inter` for body/tables on a crisp Slate light palette (`#f8fafc`).
- **Dedicated Multi-Page Navigation**:
  1. **Overview Home**: Executive Hero Banner, Grid Efficiency KPI, 4 Top Metric Cards, Real-time SVG Power Curve, Peak Hours Widget, and AI Insights snippet.
  2. **Live Monitoring**: Real-time gauge metrics (Voltage, Current, Active Power, Power Factor), Stream controls, and filterable telemetry logs table with CSV export.
  3. **AI Analytics & Predictions**: 24h consumption forecast, Isolation Forest anomaly score & fault risk framing, Carbon footprint tracker (kg CO₂ emissions), and interactive **Solar & Battery "What-If" Simulator**.
  4. **Insights & Actions**: Prioritized AI recommendations center with auto-optimize relay simulation triggers and dismiss options.
  5. **IoT Devices**: Smart grid inventory list, Relay Remote Control toggle (ON/OFF simulation), and node registration form.
  6. **Cost & Tariff Reports**: Utility tariff rate slider ($/kWh), daily consumption & monthly bill estimator.
- **Proxy Setup**: `frontend/vite.config.js` routes all `/api` traffic directly to `http://localhost:3000`.

## Hardware & Simulation
- **Wokwi ESP32 Project**: https://wokwi.com/projects/473531909019164673

## Alignment Status
- **Alignment with Overview and Phased Plan**: ✅ Fully aligned with `docs/powertrack-overview.md` and `docs/powertrack-phased-plan.md`.

Last updated: 2026-08-29T06:45:15+06:00
