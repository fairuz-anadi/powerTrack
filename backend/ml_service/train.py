"""Simple training script for PowerTrack ML service.
Reads backend/readings.log (fallback) or connects to Postgres if DATABASE_URL is set.
Trains a RandomForestRegressor to predict daily kWh from recent power readings.
Saves model to model.joblib.

Run: python train.py
"""
import os
import json
from datetime import datetime
import numpy as np

try:
    import pandas as pd
    from sklearn.ensemble import RandomForestRegressor
    from joblib import dump
except Exception as e:
    print('Missing dependencies:', e)
    print('Install requirements: pip install -r requirements.txt')
    raise

ROOT = os.path.join(os.path.dirname(__file__), '..')
READINGS_LOG = os.path.join(ROOT, 'backend', 'readings.log')
MODEL_OUT = os.path.join(os.path.dirname(__file__), 'model.joblib')

def load_from_log(path):
    rows = []
    if not os.path.exists(path):
        return pd.DataFrame()
    with open(path,'r',encoding='utf8') as f:
        for line in f:
            try:
                rows.append(json.loads(line))
            except:
                pass
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df['recorded_at'] = pd.to_datetime(df['recorded_at'])
    return df

if __name__ == '__main__':
    df = load_from_log(READINGS_LOG)
    if df.empty:
        print('No data found in', READINGS_LOG)
        exit(1)
    # Aggregate by hour -> compute avg power per hour
    df['hour'] = df['recorded_at'].dt.floor('H')
    agg = df.groupby('hour').agg(avg_power=('power_watts','mean'))
    agg = agg.reset_index()
    # For training target, compute following-day total kWh as target: sum(avg_power * 24 / 1000) approx
    # Here we use a trivial supervised target: shift avg_power by -24 hours and use as proxy (placeholder)
    agg['target_kwh'] = (agg['avg_power'].shift(-24) * 24 / 1000).fillna(0)
    # Features: recent 24 hours of avg_power
    X = []
    y = []
    for i in range(len(agg)-24):
        window = agg['avg_power'].iloc[i:i+24].values
        X.append(window)
        y.append(agg['target_kwh'].iloc[i+24])
    X = np.array(X)
    y = np.array(y)
    if len(X)==0:
        print('Not enough data for training; need at least 25 hourly aggregates')
        exit(1)
    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X,y)
    dump(model, MODEL_OUT)
    print('Model trained and saved to', MODEL_OUT)
