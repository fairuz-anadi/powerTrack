import React, { useEffect, useState } from 'react'

export default function App() {
  const [latest, setLatest] = useState(null)
  const [list, setList] = useState([])
  const [pred, setPred] = useState(null)
  const [recs, setRecs] = useState([])

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

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>PowerTrack — Dashboard (MVP)</h1>
      <section>
        <h2>Latest reading</h2>
        {latest ? (
          <pre>{JSON.stringify(latest, null, 2)}</pre>
        ) : (
          <p>No recent reading</p>
        )}
      </section>
      <section>
        <h2>Predicted next-day consumption</h2>
        {pred ? <p>{(pred.predicted_kwh||0).toFixed(2)} kWh</p> : <p>Loading...</p>}
      </section>
      <section>
        <h2>Recommendations</h2>
        {recs.length ? (
          <ul>{recs.map((r,i)=>(<li key={i}><strong>{r.level}</strong>: {r.text}</li>))}</ul>
        ) : <p>No recommendations</p>}
      </section>
      <section>
        <h2>Recent readings</h2>
        <ol>
          {list.map((r, i) => (
            <li key={i}>{r.recorded_at} — {r.power_watts} W</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
