# Phase 1 — Real Hardware & Backend Bring-Up

Status: **Complete** ✅

This document outlines the foundation setup for receiving ESP32 sensor readings and persisting data.

## Key Files Implemented
- `backend/package.json` — Node.js project manifest and dependencies (`express`, `pg`, `dotenv`).
- `backend/index.js` — Express API server handling sensor ingestion, query endpoints, rate limiting, and fallback logging.
- `backend/db_schema.sql` — PostgreSQL schema for `readings`, `predictions`, `alerts`, and `devices`.
- `backend/apply_schema.js` — Script to programmatically apply the database schema when `DATABASE_URL` is set.
- `backend/simulate.js` — Script to simulate 200 ESP32 readings into the ingestion endpoint for testing.

## Local Execution & Testing Steps
1. Navigate to the backend directory:
   ```powershell
   cd U:\powerTrack\backend
   ```
2. Start the server (using Node at `U:\Softwares\Node.js`):
   ```powershell
   $env:Path = "U:\Softwares\Node.js;" + $env:Path
   npm start
   ```
3. Post a sample reading:
   ```bash
   POST http://localhost:3000/api/readings
   Content-Type: application/json
   {"device_id":"esp1","voltage":230.1,"current":1.2,"power_watts":276.12}
   ```
4. If no `DATABASE_URL` is configured, readings are safely appended to `backend/readings.log` for immediate inspection and dashboard rendering.

## Firmware & Wokwi Integration
- ESP32 Wokwi simulation configured to HTTP POST sensor values to the server endpoint (`/api/readings`).
- Wokwi simulation link: https://wokwi.com/projects/473531909019164673

## Plan Alignment
- **Alignment with Overview and Phased Plan**: ✅ Fully aligned with Phase 1 requirements as defined in `docs/powertrack-phased-plan.md` and `docs/powertrack-overview.md`.

Last updated: 2026-08-29T06:43:30+06:00
