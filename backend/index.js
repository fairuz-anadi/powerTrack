const express = require('express');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

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
      await pool.query(
        'INSERT INTO readings(device_id, voltage, current, power_watts, recorded_at) VALUES($1,$2,$3,$4,$5)',
        [row.device_id, row.voltage, row.current, row.power_watts, row.recorded_at]
      );
      return res.json({ ok: true, stored: 'postgres' });
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`PowerTrack backend listening on ${port}`));
