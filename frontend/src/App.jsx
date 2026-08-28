import React, { useEffect, useState } from 'react'

export default function App() {
  const [latest, setLatest] = useState(null)
  const [list, setList] = useState([])

  useEffect(() => {
    fetch('/api/readings/latest')
      .then(r => r.json())
      .then(setLatest)
      .catch(() => {})
    fetch('/api/readings?limit=50')
      .then(r => r.json())
      .then(setList)
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
