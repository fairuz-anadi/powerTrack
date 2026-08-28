# Current Context (snapshot)

- Workspace path: D:\powerTrack
- Git branch: dev-anadi (pushed to origin)
- Backend: Node.js Express server at D:\powerTrack\backend
  - Running at http://192.168.0.203:3000 (background); server is accepting requests and currently storing to backend/readings.log (no DATABASE_URL configured)
  - Endpoints: POST /api/readings, GET /api/readings, /latest, /range, /health, /devices, /predictions, /detect/anomaly
  - DB schema: backend/db_schema.sql; apply schema when DATABASE_URL is set (helper: backend/apply_schema.js or npm run apply-schema). Supabase schema exists (applied manually via SQL editor) but programmatic writes require REST keys or direct DB access.
  - Supabase wiring: waiting for SUPABASE_URL and SUPABASE_SERVICE_ROLE (server key). Once provided I'll add to backend/.env (local only) and run a test insert via test_supabase.js or /api/test/supabase endpoint.
  - ML service: FastAPI scaffold added at backend/ml_service (predict/train endpoints). Python not available in this environment, so ML service wasn't started; backend ML proxy falls back to heuristic.
  - Fallback storage: backend/readings.log when no DATABASE_URL
  - Recent action: simulator posted 200 readings; readings.log contains those entries.
- Frontend: React (Vite) scaffold at D:\powerTrack\frontend; dev server running at http://localhost:5173/ (network host not exposed by default)
- Wokwi simulation link (user-provided): https://wokwi.com/projects/473531909019164673
- Notes: Local environment currently does not have PostgreSQL client/service installed (psql not found). Schema application requires a reachable Postgres instance and DATABASE_URL. Frontend installed and running; disk space on D: is sufficient.
- Recent action: Supabase schema applied manually via the SQL editor (tables created: alerts, devices, readings, predictions). Backend couldn't apply schema from this machine due to network/DNS restrictions, but the DB is now provisioned and ready.
- To enable the backend to store to Supabase: create backend/.env with DATABASE_URL=<your-Supabase-connection-string> (do NOT commit .env), then restart the backend. Alternatively, I can guide you to run `npm run apply-schema` locally if needed.

Last updated: 2026-08-29T01:48:00+06:00
