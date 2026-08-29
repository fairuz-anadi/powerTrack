# Current Context (Snapshot)

## Workspace & Git
- **Workspace Path**: `U:\powerTrack`
- **Git Branch**: `dev-anadi` (pushed to origin `https://github.com/fairuz-anadi/powerTrack`)

## Backend Service
- **Location**: `U:\powerTrack\backend`
- **Node Runtime**: Installed at `U:\Softwares\Node.js`
- **Status**: Running at `http://localhost:3000` (background process)
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
- **Active Storage**: `backend/readings.log` fallback (stores readings when `DATABASE_URL` is unconfigured)
- **Database Schema**: `backend/db_schema.sql` (ready for PostgreSQL / Supabase)

## Frontend Application
- **Location**: `U:\powerTrack\frontend`
- **Status**: Running at `http://localhost:5173` / `http://192.168.0.203:5173` (Vite background process)
- **Design System**: High-contrast, modern whitish light-mode theme (`#f8fafc` background, slate typography, glass cards, soft elevation shadows).
- **Components & Features**:
  - Inter font family & custom SVG power chart with animated area fill and grid lines.
  - Stat cards: Real-time power, voltage, current draw, predicted daily kWh, estimated monthly cost.
  - Live system health status badge (Connected/Offline).
  - Anomaly indicator with Z-score metrics.
  - Peak hours forecast blocks.
  - AI energy recommendation cards.
  - Interactive sidebar navigation (Dashboard, Readings, Predictions, Recommendations, Devices).
  - Device registration form.
- **Proxy Setup**: `frontend/vite.config.js` routes all `/api` traffic directly to `http://localhost:3000`.

## Hardware & Simulation
- **Wokwi ESP32 Project**: https://wokwi.com/projects/473531909019164673

## Alignment Status
- **Alignment with Overview and Phased Plan**: ✅ Fully aligned with `docs/powertrack-overview.md` and `docs/powertrack-phased-plan.md`.

Last updated: 2026-08-29T06:43:30+06:00
