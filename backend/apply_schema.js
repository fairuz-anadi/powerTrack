const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function apply() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set in environment. Set it in .env or pass as env var.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: dbUrl });
  try {
    const schemaPath = path.join(__dirname, 'db_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('db_schema.sql not found in backend/');
      process.exit(1);
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema.split(/;\s*\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const st of statements) {
      console.log('Running:', st.split('\n')[0].slice(0,80));
      await pool.query(st);
    }
    console.log('Schema applied successfully');
  } catch (err) {
    console.error('Failed to apply schema:', err.message || err);
  } finally {
    await pool.end();
  }
}

apply();
