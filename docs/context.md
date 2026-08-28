# Current Context (snapshot)

- Workspace path: D:\powerTrack
- Git branch: dev-anadi (pushed to origin)
- Backend: Node.js Express server at D:\powerTrack\backend
  - Running at http://192.168.0.203:3000 (background); server is accepting requests and currently storing to backend/readings.log (no DATABASE_URL configured)
  - Endpoints: POST /api/readings, GET /api/readings, /latest, /range, /health
  - DB schema: backend/db_schema.sql; apply schema when DATABASE_URL is set (helper: backend/apply_schema.js or npm run apply-schema)
  - Fallback storage: backend/readings.log when no DATABASE_URL
- Frontend: React (Vite) scaffold at D:\powerTrack\frontend; dev server running at http://localhost:5173/ (network host not exposed by default)
- Wokwi simulation link (user-provided): https://wokwi.com/projects/473531909019164673
- Notes: Local environment currently does not have PostgreSQL client/service installed (psql not found). Schema application requires a reachable Postgres instance and DATABASE_URL. Frontend installed and running; disk space on D: is sufficient.
- Recent action: attempted to apply DB schema to the provided Supabase connection, but the host failed DNS resolution (getaddrinfo ENOTFOUND). Please confirm the connection string and that the Supabase project is active and accepts external connections.

Last updated: 2026-08-29T01:48:00+06:00
