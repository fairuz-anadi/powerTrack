# Phase 1 — Real Hardware Bring-Up (Applied changes)

This repo now contains a minimal backend to receive ESP32 readings for Phase 1 testing.

Files added:
- backend/package.json — Node.js project manifest (run `npm install` in backend/)
- backend/index.js — Express server with POST /api/readings and fallback logging
- backend/db_schema.sql — PostgreSQL schema for Phase 1

Testing steps:
1. In D:\powerTrack\backend run: `npm install` then `npm start` (or set DATABASE_URL in .env to enable Postgres storage).
2. Send a sample POST to http://localhost:3000/api/readings with JSON: {"device_id":"esp1","voltage":230.1,"current":1.2,"power_watts":276.12}
3. If no DATABASE_URL is set, readings will be appended to backend/readings.log for inspection.

Commit notes: changes are confined to backend/ and docs/ to minimize merge conflicts. Next: integrate with ESP32 firmware (update HTTP target) and set up PostgreSQL per db_schema.sql.
