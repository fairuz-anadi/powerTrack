const url = 'http://localhost:3000/api/readings';
const device = 'sim-device-1';
const count = parseInt(process.argv[2] || '200');
const delay = parseInt(process.argv[3] || '20');

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function send(i){
  const power = Math.round(100 + Math.random()*900); // 100-1000 W
  const v = 230 + (Math.random()-0.5)*5;
  const c = power / v;
  const body = { device_id: device, voltage: v.toFixed(2), current: c.toFixed(3), power_watts: power };
  try{
    const r = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await r.json().catch(()=>null);
    console.log(i, power, j && j.stored);
  }catch(e){ console.error('send failed', e.message || e); }
}

(async ()=>{
  for(let i=1;i<=count;i++){
    await send(i);
    await sleep(delay);
  }
  console.log('done');
})();
