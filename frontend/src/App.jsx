import React, { useEffect, useState } from 'react'

function SmallChart({data=[]}){
  if (!data.length) return <div style={{height:120}}>No chart data</div>
  const vals = data.map(d=>Number(d.power_watts||0))
  const max = Math.max(...vals,1)
  const points = vals.map((v,i)=> `${(i/(vals.length-1))*100},${100 - (v/max*100)}` ).join(' ')
  return (
    <svg viewBox="0 0 100 100" style={{width:'100%',height:120,background:'#fff'}}> 
      <polyline fill="none" stroke="#0b69ff" strokeWidth="1.5" points={points} />
    </svg>
  )
}

export default function App() {
  const [latest, setLatest] = useState(null)
  const [list, setList] = useState([])
  const [pred, setPred] = useState(null)
  const [recs, setRecs] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [deviceLabel, setDeviceLabel] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/readings/latest')
      .then(r => r.json())
      .then(setLatest)
      .catch(() => {})
    fetch('/api/readings?limit=50')
      .then(r => r.json())
      .then(setList)
      .catch(() => {})
    fetch('/api/predictions/next-day')
      .then(r => r.json())
      .then(d => setPred(d))
      .catch(() => {})
    fetch('/api/recommendations')
      .then(r => r.json())
      .then(d => setRecs(d.recommendations || []))
      .catch(() => {})
  }, [])

  async function registerDevice(e){
    e.preventDefault();
    setMsg('')
    if (!deviceId) return setMsg('device_id required')
    try{
      const r = await fetch('/api/devices',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({device_id:deviceId,label:deviceLabel})})
      const j = await r.json();
      setMsg('Registered: ' + (j.stored||'ok'))
      setDeviceId(''); setDeviceLabel('')
    }catch(err){ setMsg('failed') }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', maxWidth:900}}>
      <h1>PowerTrack — Dashboard (MVP)</h1>
      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20}}>
      <div>
        <section>
          <h2>Latest reading</h2>
          {latest ? (
            <pre style={{background:'#f8f8f8',padding:10}}>{JSON.stringify(latest, null, 2)}</pre>
          ) : (
            <p>No recent reading</p>
          )}
        </section>

        <section>
          <h2>Predicted next-day consumption</h2>
          {pred ? <p>{(pred.predicted_kwh||0).toFixed(2)} kWh</p> : <p>Loading...</p>}
        </section>

        <section>
          <h2>Recent readings (chart)</h2>
          <SmallChart data={list.slice(-40)} />
          <ol style={{maxHeight:180,overflow:'auto'}}>
            {list.map((r, i) => (
              <li key={i}>{r.recorded_at} — {r.power_watts} W</li>
            ))}
          </ol>
        </section>

      </div>

      <aside style={{borderLeft:'1px solid #eee',paddingLeft:16}}>
        <section>
          <h3>Recommendations</h3>
          {recs.length ? (
            <ul>{recs.map((r,i)=>(<li key={i}><strong>{r.level}</strong>: {r.text}</li>))}</ul>
          ) : <p>No recommendations</p>}
        </section>

        <section style={{marginTop:16}}>
          <h3>Register device</h3>
          <form onSubmit={registerDevice}>
            <div><input placeholder="device id" value={deviceId} onChange={e=>setDeviceId(e.target.value)} style={{width:'100%'}}/></div>
            <div style={{marginTop:8}}><input placeholder="label (optional)" value={deviceLabel} onChange={e=>setDeviceLabel(e.target.value)} style={{width:'100%'}}/></div>
            <div style={{marginTop:8}}><button type="submit">Register</button></div>
            {msg && <div style={{marginTop:8}}>{msg}</div>}
          </form>
        </section>

        <section style={{marginTop:16}}>
          <h3>Actions</h3>
          <div><button onClick={()=>{fetch('/api/ml/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}).then(r=>r.json()).then(j=>alert(JSON.stringify(j))).catch(()=>alert('failed'))}}>Run ML predict (proxy)</button></div>
        </section>

      </aside>
      </div>
    </div>
  )
}
