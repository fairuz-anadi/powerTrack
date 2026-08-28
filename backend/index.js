const express = require('express');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

app.post('/api/readings', async (req, res) => {
  try {
    const { device_id, voltage, current, power_watts } = req.body;
    if (!device_id || voltage == null || current == null || power_watts == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const row = {
      device_id,
      voltage: Number(voltage),
      current: Number(current),
      power_watts: Number(power_watts),
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

app.get('/api/readings/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`PowerTrack backend listening on ${port}`));
