# Current Context (snapshot)

- Workspace path: U:\powerTrack
- Git branch: dev-anadi (pushed to origin)
- Backend: Node.js Express server at U:\powerTrack\backend
  - Running at http://localhost:3000 (background task); server accepting requests
  - Endpoints: POST /api/readings, GET /api/readings, /latest, /range, /health, /devices, /predictions, /detect/anomaly, /bill-estimate, /recommendations
  - Storage: backend/readings.log active fallback
- Frontend: React (Vite) dashboard at U:\powerTrack\frontend
  - Running at http://localhost:5173 / http://192.168.0.203:5173
  - UI Redesign: Professional dark-mode design system with responsive glassmorphism, animated SVG power consumption chart, live health status, peak hour predictions, AI recommendation cards, and device management form.
  - Proxy: `vite.config.js` proxies `/api` calls directly to `http://localhost:3000`.
- Wokwi simulation link: https://wokwi.com/projects/473531909019164673
- Alignment with Overview and Phased Plan: ✅ All work strictly follows the defined roadmap.

Last updated: 2026-08-29T06:38:50+06:00
