// Test script to verify Supabase REST insert using SERVICE_ROLE key from environment
const fetch = global.fetch || require('node-fetch');
require('dotenv').config();

(async ()=>{
  const urlBase = (process.env.SUPABASE_URL || '').replace(/\/+$/,'');
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_KEY;
  if (!urlBase || !key) return console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE (or SUPABASE_KEY) required in env');
  const url = `${urlBase}/rest/v1/readings`;
  const row = { device_id: 'test-supabase', voltage: 230, current: 1.2, power_watts: 276.12, recorded_at: new Date().toISOString() };
  try{
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json', 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer':'return=representation' }, body: JSON.stringify(row) });
    const txt = await resp.text();
    console.log('status', resp.status, txt);
  }catch(e){ console.error('failed', e.message || e) }
})();
