-- PowerTrack Phase 1 SQL schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    voltage FLOAT NOT NULL,
    current FLOAT NOT NULL,
    power_watts FLOAT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON readings (recorded_at DESC);

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    prediction_type VARCHAR(30) NOT NULL,
    predicted_value FLOAT NOT NULL,
    predicted_for TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100),
    name VARCHAR(100),
    relay_pin VARCHAR(20),
    is_essential BOOLEAN DEFAULT TRUE,
    current_state VARCHAR(10) DEFAULT 'on',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
