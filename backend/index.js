const express = require('express');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const fetch = global.fetch || require('node-fetch');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function parseLogLines(limit) {
  if (!fs.existsSync('readings.log')) return [];
  const lines = fs.readFileSync('readings.log', 'utf8').trim().split('\n').filter(Boolean);
  const selected = lines.slice(-limit);
  return selected.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

app.post('/api/readings', async (req, res) => {
  try {
    const { device_id, voltage, current, power_watts } = req.body;
    if (!device_id || voltage == null || current == null || power_watts == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const v = Number(voltage);
    const c = Number(current);
    const p = Number(power_watts);
    if (v < 0 || c < 0 || p < 0) return res.status(422).json({ error: 'Values must be non-negative' });

    const row = {
      device_id,
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
    fs.appendFileSync('readings.log', JSON.stringify(row) + '\n');
    return res.json({ ok: true, stored: 'file' });
  } catch (err) {
    console.error('POST /api/readings error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// GET /api/readings?limit=50
app.get('/api/readings', async (req, res) => {
  try {
    const limit = Math.min(1000, parseInt(req.query.limit) || 50);
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
    if (pool) {
      const { rows } = await pool.query('SELECT * FROM readings WHERE recorded_at BETWEEN $1 AND $2 ORDER BY recorded_at ASC', [start, end]);
      return res.json(rows);
    }
    const all = parseLogLines(1000000);
    const filtered = all.filter(r => r.recorded_at >= start && r.recorded_at <= end);
    return res.json(filtered);
  } catch (err) {
    console.error('GET /api/readings/range error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

app.get('/api/readings/health', (req, res) => res.json({ ok: true }));

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
  fs.appendFileSync('predictions.log', JSON.stringify(row) + '\n');
}

async function saveAlert(device_id, description, severity='low') {
  const row = { device_id, description, severity, detected_at: new Date().toISOString() };
  if (pool) {
    await pool.query('INSERT INTO alerts(device_id, description, severity, detected_at) VALUES($1,$2,$3,$4)', [row.device_id, row.description, row.severity, row.detected_at]);
    return;
  }
  fs.appendFileSync('alerts.log', JSON.stringify(row) + '\n');
}

function mean(arr) { if (!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length }
function stddev(arr){ if (arr.length<2) return 0; const m=mean(arr); return Math.sqrt(arr.reduce((s,x)=>s+(x-m)*(x-m),0)/(arr.length-1)); }

// Phase 4: simple next-day prediction (heuristic)
app.get('/api/predictions/next-day', async (req, res) => {
  try {
    const readings = await getRecentReadings(500);
    if (!readings.length) return res.json({ predicted_kwh: 0});
    const avgPower = mean(readings.map(r=>Number(r.power_watts || 0)));
    const predicted_kwh = (avgPower * 24) / 1000; // W -> kWh per day
    await savePrediction('next_day_consumption', predicted_kwh, new Date(Date.now() + 24*3600*1000).toISOString());
    return res.json({ predicted_kwh });
  } catch (err) {
    console.error('GET /api/predictions/next-day error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 4: peak hour prediction (hour with highest average)
app.get('/api/predictions/peak-hours', async (req, res) => {
  try {
    const readings = await getRecentReadings(2000);
    if (!readings.length) return res.json({ peak_hours: [] });
    const hours = Array.from({length:24}, ()=>[]);
    readings.forEach(r=>{
      const h = new Date(r.recorded_at).getHours();
      hours[h].push(Number(r.power_watts||0));
    });
    const avgByHour = hours.map(harr => mean(harr));
    const maxAvg = Math.max(...avgByHour);
    const peak_hours = avgByHour.map((v,idx)=> v===maxAvg?idx:null).filter(x=>x!==null);
    await savePrediction('peak_hours', maxAvg, new Date().toISOString());
    return res.json({ peak_hours, maxAvg });
  } catch (err) {
    console.error('GET /api/predictions/peak-hours error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 4: anomaly detection (simple z-score)
app.post('/api/detect/anomaly', async (req, res) => {
  try {
    const payload = req.body && req.body.reading ? req.body.reading : null;
    const latest = payload || (await getRecentReadings(1))[0];
    if (!latest) return res.status(400).json({ error: 'no reading provided or available' });
    const readings = (await getRecentReadings(200)).map(r=>Number(r.power_watts||0));
    const m = mean(readings); const s = stddev(readings);
    const val = Number(latest.power_watts||0);
    const z = s>0 ? Math.abs((val - m)/s) : 0;
    const isAnomaly = z > 3;
    if (isAnomaly) await saveAlert(latest.device_id || 'unknown', `Anomalous power reading: ${val}W (z=${z.toFixed(2)})`, 'medium');
    return res.json({ isAnomaly, z, value: val });
  } catch (err) {
    console.error('POST /api/detect/anomaly error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Phase 5: bill estimation
app.get('/api/bill-estimate', async (req, res) => {
  try {
    const tariff = Number(req.query.tariff) || 0.12; // default USD per kWh
    // use next-day prediction as basis
    const p = await (await fetch('http://localhost:'+(process.env.PORT||3000)+'/api/predictions/next-day')).json();
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
    const p = await (await fetch('http://localhost:'+(process.env.PORT||3000)+'/api/predictions/next-day')).json();
    const a = await (await fetch('http://localhost:'+(process.env.PORT||3000)+'/api/predictions/peak-hours')).json();
    const recs = [];
    if ((p.predicted_kwh||0) > 10) recs.push({ level: 'high', text: `High predicted consumption tomorrow: ${ (p.predicted_kwh||0).toFixed(2) } kWh — consider turning off non-essential devices during peak hours.` });
    if ((a.peak_hours||[]).length) recs.push({ level: 'info', text: `Predicted peak hours: ${ (a.peak_hours||[]).join(', ') }` });
    // check recent anomalies
    const anomalyCheck = await (await fetch('http://localhost:'+(process.env.PORT||3000)+'/api/readings/latest')).json();
    const anomaly = await (await fetch('http://localhost:'+(process.env.PORT||3000)+'/api/detect/anomaly',{ method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({reading: anomalyCheck}) })).json();
    if (anomaly.isAnomaly) recs.push({ level: 'warning', text: `Anomaly detected: ${anomaly.value}W (z=${anomaly.z.toFixed(2)}) — inspect connected devices.` });
    return res.json({ recommendations: recs });
  } catch (err) {
    console.error('GET /api/recommendations error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

const path = require('path');
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

app.listen(port, async () => {
  console.log(`PowerTrack backend listening on ${port}`);
  if (pool) await ensureSchema();
});
