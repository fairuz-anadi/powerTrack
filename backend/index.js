const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const fetch = global.fetch || require('node-fetch');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_KEY;
const RELAY_API_KEY = process.env.RELAY_API_KEY;
const DATA_FILES = {
  readings: path.join(__dirname, 'readings.log'),
  predictions: path.join(__dirname, 'predictions.log'),
  alerts: path.join(__dirname, 'alerts.log')
};

if (pool) {
  pool.on('error', err => console.error('Postgres pool error:', err.message || err));
}

// Simple in-memory rate limiter (per-IP, minute window)
const rateMap = new Map();
function rateLimiter(req, res, next){
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, ts: now };
  if (now - entry.ts > 60_000) { entry.count = 0; entry.ts = now; }
  entry.count++;
  rateMap.set(ip, entry);
  if (entry.count > 300) return res.status(429).json({ error: 'rate limit exceeded' });
  next();
}
app.use(rateLimiter);

function finiteNumber(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function relayAuthorization(req, res, next) {
  if (process.env.NODE_ENV === 'production' && !RELAY_API_KEY) {
    return res.status(503).json({ error: 'Relay control is not configured' });
  }
  if (!RELAY_API_KEY) return next();

  const bearerToken = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const providedKey = req.get('x-relay-api-key') || bearerToken;
  if (providedKey !== RELAY_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized relay control request' });
  }
  next();
}

function parseLogLines(limit) {
  if (!fs.existsSync(DATA_FILES.readings)) return [];
  const lines = fs.readFileSync(DATA_FILES.readings, 'utf8').trim().split('\n').filter(Boolean);
  const selected = lines.slice(-limit);
  return selected.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

app.post('/api/readings', async (req, res) => {
  try {
    const { device_id, voltage, current, power_watts } = req.body || {};
    const deviceId = typeof device_id === 'string' ? device_id.trim() : '';
    if (!deviceId || deviceId.length > 50 || voltage == null || current == null || power_watts == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const v = finiteNumber(voltage);
    const c = finiteNumber(current);
    const p = finiteNumber(power_watts);
    if (v == null || c == null || p == null || v < 0 || c < 0 || p < 0) {
      return res.status(422).json({ error: 'Voltage, current, and power_watts must be finite non-negative numbers' });
    }

    const row = {
      device_id: deviceId,
      voltage: v,
      current: c,
      power_watts: p,
      recorded_at: new Date().toISOString()
    };

    if (pool) {
      try {
        await pool.query(
          'INSERT INTO readings(device_id, voltage, current, power_watts, recorded_at) VALUES($1,$2,$3,$4,$5)',
          [row.device_id, row.voltage, row.current, row.power_watts, row.recorded_at]
        );
        return res.json({ ok: true, stored: 'postgres' });
      } catch (dbErr) {
        console.error('Postgres insert failed, will attempt REST fallback:', dbErr.message || dbErr);
        // fall through to REST fallback
      }
    }

    // REST fallback to Supabase if URL/key provided
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const url = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/readings`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(row)
        });
        if (!resp.ok) {
          const txt = await resp.text();
          console.error('Supabase REST insert failed:', resp.status, txt);
        } else {
          const data = await resp.json();
          return res.json({ ok: true, stored: 'supabase-rest', result: data });
        }
      } catch (restErr) {
        console.error('Supabase REST insert error:', restErr.message || restErr);
      }
    }

    // Fallback: append to local log for easy testing
    fs.appendFileSync(DATA_FILES.readings, JSON.stringify(row) + '\n');
    return res.json({ ok: true, stored: 'file' });
  } catch (err) {
    console.error('POST /api/readings error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// GET /api/readings?limit=50
app.get('/api/readings', async (req, res) => {
  try {
    const requestedLimit = req.query.limit == null ? 50 : Number(req.query.limit);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
      return res.status(400).json({ error: 'limit must be a positive integer' });
    }
    const limit = Math.min(1000, requestedLimit);
    if (pool) {
      const { rows } = await pool.query('SELECT * FROM readings ORDER BY recorded_at DESC LIMIT $1', [limit]);
      return res.json(rows);
    }
    const rows = parseLogLines(limit).reverse(); // oldest first
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/readings error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// GET /api/readings/latest
app.get('/api/readings/latest', async (req, res) => {
  try {
    if (pool) {
      const { rows } = await pool.query('SELECT * FROM readings ORDER BY recorded_at DESC LIMIT 1');
      return res.json(rows[0] || null);
    }
    const rows = parseLogLines(1);
    return res.json(rows.length ? rows[0] : null);
  } catch (err) {
    console.error('GET /api/readings/latest error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// GET /api/readings/range?start=YYYY-MM-DDTHH:MM:SS&end=...
app.get('/api/readings/range', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end query params required' });
    const startMs = Date.parse(start);
    const endMs = Date.parse(end);
    const maxRangeMs = 31 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
      return res.status(400).json({ error: 'start and end must be valid dates, with start before end' });
    }
    if (endMs - startMs > maxRangeMs) {
      return res.status(400).json({ error: 'Requested range cannot exceed 31 days' });
    }
    if (pool) {
      const { rows } = await pool.query('SELECT * FROM readings WHERE recorded_at BETWEEN $1 AND $2 ORDER BY recorded_at ASC', [start, end]);
      return res.json(rows);
    }
    const all = parseLogLines(1000000);
    const filtered = all.filter(r => {
      const recordedAtMs = Date.parse(r.recorded_at);
      return Number.isFinite(recordedAtMs) && recordedAtMs >= startMs && recordedAtMs <= endMs;
    });
    return res.json(filtered);
  } catch (err) {
    console.error('GET /api/readings/range error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

app.get('/api/readings/health', async (req, res) => {
  if (!pool) return res.json({ ok: true, storage: 'file' });
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, storage: 'postgres' });
  } catch (err) {
    return res.status(503).json({ ok: false, storage: 'postgres', error: 'Database unavailable' });
  }
});

// Helper: get recent readings (ascending by recorded_at)
async function getRecentReadings(limit = 500) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM readings ORDER BY recorded_at DESC LIMIT $1', [limit]);
    return rows.reverse();
  }
  // fallback to file
  return parseLogLines(limit).reverse();
}

async function savePrediction(predType, value, predicted_for) {
  const row = { prediction_type: predType, predicted_value: value, predicted_for: predicted_for, created_at: new Date().toISOString() };
  if (pool) {
    await pool.query('INSERT INTO predictions(prediction_type, predicted_value, predicted_for, created_at) VALUES($1,$2,$3,$4)', [row.prediction_type, row.predicted_value, row.predicted_for, row.created_at]);
    return;
  }
  fs.appendFileSync(DATA_FILES.predictions, JSON.stringify(row) + '\n');
}

async function saveAlert(device_id, description, severity='low') {
  const row = { device_id, description, severity, detected_at: new Date().toISOString() };
  if (pool) {
    await pool.query('INSERT INTO alerts(device_id, description, severity, detected_at) VALUES($1,$2,$3,$4)', [row.device_id, row.description, row.severity, row.detected_at]);
    return;
  }
  fs.appendFileSync(DATA_FILES.alerts, JSON.stringify(row) + '\n');
}

function mean(arr) { if (!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length }
function stddev(arr){ if (arr.length<2) return 0; const m=mean(arr); return Math.sqrt(arr.reduce((s,x)=>s+(x-m)*(x-m),0)/(arr.length-1)); }

async function calculateNextDayPrediction() {
  const readings = await getRecentReadings(500);
  if (!readings.length) return { predicted_kwh: 0 };
  const avgPower = mean(readings.map(r => Number(r.power_watts || 0)));
  return { predicted_kwh: (avgPower * 24) / 1000 };
}

async function calculatePeakHours() {
  const readings = await getRecentReadings(2000);
  if (!readings.length) return { peak_hours: [] };
  const hours = Array.from({ length: 24 }, () => []);
  readings.forEach(r => hours[new Date(r.recorded_at).getHours()].push(Number(r.power_watts || 0)));
  const avgByHour = hours.map(hourReadings => mean(hourReadings));
  const maxAvg = Math.max(...avgByHour);
  return { peak_hours: avgByHour.map((value, hour) => value === maxAvg ? hour : null).filter(hour => hour !== null), maxAvg };
}

async function analyzeAnomaly(reading) {
  const latest = reading || (await getRecentReadings(1))[0];
  if (!latest) return null;
  const readings = (await getRecentReadings(200)).map(r => Number(r.power_watts || 0));
  const m = mean(readings);
  const s = stddev(readings);
  const value = Number(latest.power_watts || 0);
  const z = s > 0 ? Math.abs((value - m) / s) : 0;
  return { isAnomaly: z > 3, z, value, mean: m, stddev: s, device_id: latest.device_id || 'unknown' };
}

// These read-only endpoints are safe for dashboard polling. Prediction/alert
// history should be written by a scheduled job or an explicit action instead.
app.get('/api/predictions/next-day', async (req, res) => {
  try {
    return res.json(await calculateNextDayPrediction());
  } catch (err) {
    console.error('GET /api/predictions/next-day error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

app.get('/api/predictions/peak-hours', async (req, res) => {
  try {
    return res.json(await calculatePeakHours());
  } catch (err) {
    console.error('GET /api/predictions/peak-hours error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

app.post('/api/detect/anomaly', async (req, res) => {
  try {
    const anomaly = await analyzeAnomaly(req.body?.reading);
    if (!anomaly) return res.status(400).json({ error: 'no reading provided or available' });
    if (anomaly.isAnomaly && req.body?.persist_alert === true) {
      await saveAlert(anomaly.device_id, `Anomalous power reading: ${anomaly.value}W (z=${anomaly.z.toFixed(2)})`, 'medium');
    }
    return res.json(anomaly);
  } catch (err) {
    console.error('POST /api/detect/anomaly error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 4: Full Z-Score Series Telemetry for Graphical Visualization
app.get('/api/analytics/zscores', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 10), 500);
    const threshold = parseFloat(req.query.threshold || '3.0') || 3.0;
    const rawReadings = await getRecentReadings(limit);
    if (!rawReadings.length) {
      return res.json({ mean: 0, stddev: 0, threshold, points: [], anomalyCount: 0, warningCount: 0 });
    }
    const powers = rawReadings.map(r => Number(r.power_watts || 0));
    const m = mean(powers);
    const s = stddev(powers);

    let anomalyCount = 0;
    let warningCount = 0;
    const points = rawReadings.map(r => {
      const val = Number(r.power_watts || 0);
      const rawZ = s > 0 ? (val - m) / s : 0;
      const absZ = Math.abs(rawZ);
      const isAnomaly = absZ >= threshold;
      const isWarning = !isAnomaly && absZ >= 2.0;
      if (isAnomaly) anomalyCount++;
      if (isWarning) warningCount++;
      return {
        recorded_at: r.recorded_at,
        device_id: r.device_id,
        power_watts: val,
        z: parseFloat(rawZ.toFixed(3)),
        abs_z: parseFloat(absZ.toFixed(3)),
        isAnomaly,
        isWarning
      };
    });

    return res.json({
      mean: parseFloat(m.toFixed(2)),
      stddev: parseFloat(s.toFixed(2)),
      threshold,
      anomalyCount,
      warningCount,
      points
    });
  } catch (err) {
    console.error('GET /api/analytics/zscores error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 5: bill estimation
app.get('/api/bill-estimate', async (req, res) => {
  try {
    const tariff = req.query.tariff == null ? 0.12 : finiteNumber(req.query.tariff);
    if (tariff == null || tariff < 0) return res.status(400).json({ error: 'tariff must be a finite non-negative number' });
    const p = await calculateNextDayPrediction();
    const daily_kwh = Number(p.predicted_kwh||0);
    const monthly_kwh = daily_kwh * 30;
    const estimate = monthly_kwh * tariff;
    return res.json({ monthly_kwh, estimate, tariff });
  } catch (err) {
    console.error('GET /api/bill-estimate error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 5: recommendations (rule-based)
app.get('/api/recommendations', async (req, res) => {
  try {
    const p = await calculateNextDayPrediction();
    const a = await calculatePeakHours();
    const recs = [];
    if ((p.predicted_kwh||0) > 10) recs.push({ level: 'high', text: `High predicted consumption tomorrow: ${ (p.predicted_kwh||0).toFixed(2) } kWh — consider turning off non-essential devices during peak hours.` });
    if ((a.peak_hours||[]).length) recs.push({ level: 'info', text: `Predicted peak hours: ${ (a.peak_hours||[]).join(', ') }` });
    // check recent anomalies
    const anomaly = await analyzeAnomaly();
    if (anomaly?.isAnomaly) recs.push({ level: 'warning', text: `Anomaly detected: ${anomaly.value}W (z=${anomaly.z.toFixed(2)}) — inspect connected devices.` });
    return res.json({ recommendations: recs });
  } catch (err) {
    console.error('GET /api/recommendations error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 6.1: Carbon Footprint Tracking
app.get('/api/carbon-footprint', async (req, res) => {
  try {
    const readings = await getRecentReadings(500);
    const avgPower = mean(readings.map(r => Number(r.power_watts || 0)));
    const dailyKwh = (avgPower * 24) / 1000;
    const gridFactor = 0.82; // kg CO2 per kWh
    const dailyCo2Kg = dailyKwh * gridFactor;
    const weeklyCo2Kg = dailyCo2Kg * 7;
    const co2SavedKg = dailyCo2Kg * 0.18; // 18% savings with AI optimization
    return res.json({ dailyKwh, dailyCo2Kg, weeklyCo2Kg, co2SavedKg, gridFactor });
  } catch (err) {
    console.error('GET /api/carbon-footprint error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 6.2: Electrical Fault & Fire Risk Framing
app.get('/api/detect/fault-risk', async (req, res) => {
  try {
    const latest = (await getRecentReadings(1))[0];
    if (!latest) return res.json({ faultRisk: false, riskLevel: 'low', message: 'No readings available' });
    const power = Number(latest.power_watts || 0);
    const voltage = Number(latest.voltage || 0);
    const isOvercurrent = power > 400;
    const isVoltageSag = voltage < 205 && power > 200;
    const faultRisk = isOvercurrent || isVoltageSag;
    const riskLevel = isOvercurrent ? 'high' : isVoltageSag ? 'medium' : 'low';
    
    if (faultRisk && req.query.persist_alert === 'true') {
      await saveAlert(latest.device_id || 'esp32-main-01', `Fault Risk Warning: ${power}W at ${voltage}V`, riskLevel);
    }
    return res.json({ faultRisk, riskLevel, power, voltage, timestamp: latest.recorded_at });
  } catch (err) {
    console.error('GET /api/detect/fault-risk error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 6.3: Solar & Battery What-If Simulator
app.post('/api/simulate/solar', (req, res) => {
  try {
    const { solar_kw = 3, battery_kwh = 5, tariff = 0.12 } = req.body || {};
    const solarGenerationKwhDaily = solar_kw * 4.2; // 4.2 peak sun hours
    const monthlySolarKwh = solarGenerationKwhDaily * 30;
    const monthlySavingsDollars = monthlySolarKwh * tariff;
    const co2OffsetMonthlyKg = monthlySolarKwh * 0.82;
    return res.json({
      solar_kw,
      battery_kwh,
      solarGenerationKwhDaily,
      monthlySavingsDollars,
      co2OffsetMonthlyKg
    });
  } catch (err) {
    console.error('POST /api/simulate/solar error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 7: Automation & Smart Relay Command Handling (ESP32 Polling & Manual Override)
let relayControllerState = {
  device_id: 'esp32-main-01',
  relay_state: 'ON',       // 'ON' or 'OFF'
  control_mode: 'AUTO',    // 'AUTO' or 'MANUAL'
  last_action_by: 'system',
  last_updated: new Date().toISOString()
};

// ESP32 queries current relay command state
app.get('/api/devices/relay', (req, res) => {
  return res.json(relayControllerState);
});

// Dashboard or AI automation changes relay state
app.post('/api/devices/relay', relayAuthorization, (req, res) => {
  try {
    const { relay_state, control_mode, triggered_by } = req.body || {};
    if (relay_state && ['ON', 'OFF'].includes(relay_state.toUpperCase())) {
      relayControllerState.relay_state = relay_state.toUpperCase();
    }
    if (control_mode && ['AUTO', 'MANUAL'].includes(control_mode.toUpperCase())) {
      relayControllerState.control_mode = control_mode.toUpperCase();
    }
    relayControllerState.last_action_by = triggered_by || 'user';
    relayControllerState.last_updated = new Date().toISOString();
    return res.json({ ok: true, state: relayControllerState });
  } catch (err) {
    console.error('POST /api/devices/relay error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

const port = process.env.PORT || 3000;

async function ensureSchema() {
  if (!pool) return;
  try {
    const schemaPath = path.join(__dirname, 'db_schema.sql');
    if (!fs.existsSync(schemaPath)) return;
    const schema = fs.readFileSync(schemaPath, 'utf8');
    // Split on semicolons and run statements sequentially to avoid pg multi-statement issues
    const statements = schema.split(/;\s*\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const st of statements) {
      await pool.query(st);
    }
    console.log('Database schema applied');
  } catch (err) {
    console.error('Failed to apply DB schema:', err.message || err);
  }
}

async function startServer() {
  // Apply the schema before accepting requests so a newly provisioned database
  // cannot receive telemetry before the tables and range-query index exist.
  if (pool) await ensureSchema();
  app.listen(port, '0.0.0.0', () => {
    console.log(`PowerTrack backend listening on port ${port} (0.0.0.0)`);
  });
}

startServer();
