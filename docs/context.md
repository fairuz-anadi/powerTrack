# Current Context (snapshot)

- Workspace path: D:\powerTrack
- Git branch: dev-anadi (pushed to origin)
- Backend: Node.js Express server at D:\powerTrack\backend
  - Running at http://192.168.0.203:3000 (background)
  - Endpoints: POST /api/readings, GET /api/readings, /latest, /range, /health
  - DB schema: backend/db_schema.sql; apply schema when DATABASE_URL is set
  - Fallback storage: backend/readings.log when no DATABASE_URL
- Frontend: React (Vite) scaffold at D:\powerTrack\frontend; fetches /api/readings
- Wokwi simulation link (user-provided): https://wokwi.com/projects/473531909019164673
- Notes: Local environment currently does not have PostgreSQL client/service installed (psql not found). Schema application requires a reachable Postgres instance and DATABASE_URL.

Last updated: 2026-08-29T01:03:00+06:00
