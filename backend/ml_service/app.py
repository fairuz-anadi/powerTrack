from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os

# Lightweight ML microservice scaffold.
# To run locally: python -m uvicorn app:app --reload --port 8000
# Requires: fastapi, uvicorn, scikit-learn, pandas (optional)

app = FastAPI(title="PowerTrack ML Service")

class Reading(BaseModel):
    device_id: Optional[str]
    voltage: float
    current: float
    power_watts: float
    recorded_at: Optional[str]

class PredictRequest(BaseModel):
    readings: Optional[List[Reading]] = None

@app.post('/predict')
async def predict(req: PredictRequest):
    # Simple heuristic: average power -> kWh/day
    readings = req.readings or []
    if not readings:
        return {"predicted_kwh": 0.0, "note": "no readings provided"}
    vals = [r.power_watts for r in readings if r and r.power_watts is not None]
    if not vals:
        return {"predicted_kwh": 0.0, "note": "no power values"}
    avg_w = sum(vals) / len(vals)
    predicted_kwh = (avg_w * 24.0) / 1000.0
    return {"predicted_kwh": predicted_kwh, "model": "heuristic-v1"}

@app.post('/train')
async def train(dummy: dict = {}):
    # Placeholder train endpoint — returns OK. Replace with real training when data available.
    return {"status": "ok", "note": "training not implemented in scaffold"}
