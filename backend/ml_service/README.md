PowerTrack ML service

Files:
- app.py — FastAPI scaffold (predict, train endpoints)
- train.py — training script (reads backend/readings.log or DB, trains RandomForestRegressor)
- requirements.txt — Python deps

Run training locally:
1. Install Python and create venv
2. pip install -r requirements.txt
3. python train.py

Run service:
- python -m uvicorn app:app --port 8000

Notes:
- This scaffold uses a heuristic model initially. Training requires enough historical data (hourly aggregates). The training script is a placeholder and should be extended with proper target calculation and evaluation metrics (RMSE/MAE).
