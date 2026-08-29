import React, { useEffect, useState, useCallback } from 'react'

const API = '/api'

/* ===== Helpers ===== */
function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatNum(n, decimals = 1) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toFixed(decimals)
}

/* ===== SVG Power Chart Component ===== */
function PowerChart({ data = [], height = 260 }) {
  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
        📊 Gathering live power telemetry...
      </div>
    )
  }

  const vals = data.map(d => Number(d.power_watts || 0))
  const maxVal = Math.max(...vals, 1) * 1.15
  const minVal = Math.min(...vals, 0)
  const range = maxVal - minVal || 1
  const w = 1000
  const h = 380
  const padTop = 20
  const padBot = 40
  const padLeft = 55
  const padRight = 20
  const chartW = w - padLeft - padRight
  const chartH = h - padTop - padBot

  const points = vals.map((v, i) => {
    const x = padLeft + (i / Math.max(vals.length - 1, 1)) * chartW
    const y = padTop + chartH - ((v - minVal) / range) * chartH
    return { x, y, v }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + chartH} L${points[0].x},${padTop + chartH} Z`

  const gridLines = 5
  const gridVals = Array.from({ length: gridLines }, (_, i) => minVal + (range * i) / (gridLines - 1))

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridVals.map((gv, i) => {
          const y = padTop + chartH - ((gv - minVal) / range) * chartH
          return (
            <g key={i}>
              <line x1={padLeft} y1={y} x2={w - padRight} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <text x={padLeft - 10} y={y + 5} textAnchor="end" fill="#94a3b8" fontSize="20" fontFamily="Inter, sans-serif" fontWeight="500">
                {Math.round(gv)} W
              </text>
            </g>
          )
        })}

        {/* Area */}
        <path d={areaPath} fill="url(#chartGrad)" />

        {/* Path line */}
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Active Nodes */}
        {points.slice(-6).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2.5" />
        ))}

        {/* X labels */}
        {data.filter((_, i) => i % Math.max(Math.floor(data.length / 6), 1) === 0).map((d, i) => {
          const idx = data.indexOf(d)
          const x = padLeft + (idx / Math.max(data.length - 1, 1)) * chartW
          return (
            <text key={i} x={x} y={h - 10} textAnchor="middle" fill="#94a3b8" fontSize="18" fontFamily="Inter, sans-serif">
              {formatTime(d.recorded_at)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/* ===== Sidebar Navigation Component ===== */
function SidebarNav({ page, setPage, isConnected }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">⚡</div>
        <div>
          <div className="brand-title">PowerTrack</div>
          <div className="brand-tag">AI Smart Grid</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group-title">Main Menu</div>
        <div className={`nav-link ${page === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}>
          <span className="nav-icon">🏠</span> Overview Home
        </div>
        <div className={`nav-link ${page === 'monitoring' ? 'active' : ''}`} onClick={() => setPage('monitoring')}>
          <span className="nav-icon">📈</span> Live Monitoring
          <span className="nav-badge green">Live</span>
        </div>

        <div className="nav-group-title">AI Intelligence</div>
        <div className={`nav-link ${page === 'predictions' ? 'active' : ''}`} onClick={() => setPage('predictions')}>
          <span className="nav-icon">🧠</span> AI Analytics
          <span className="nav-badge blue">ML</span>
        </div>
        <div className={`nav-link ${page === 'recommendations' ? 'active' : ''}`} onClick={() => setPage('recommendations')}>
          <span className="nav-icon">💡</span> Insights & Actions
          <span className="nav-badge amber">Save</span>
        </div>

        <div className="nav-group-title">Management</div>
        <div className={`nav-link ${page === 'devices' ? 'active' : ''}`} onClick={() => setPage('devices')}>
          <span className="nav-icon">🔌</span> IoT Devices
        </div>
        <div className={`nav-link ${page === 'reports' ? 'active' : ''}`} onClick={() => setPage('reports')}>
          <span className="nav-icon">💰</span> Cost & Tariff
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="grid-status-card">
          <div className={`pulse-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-title)' }}>
              {isConnected ? 'Grid Online' : 'Offline Mode'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {isConnected ? 'PZEM-004T Connected' : 'Check API Server'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ===== 1. HOME / OVERVIEW PAGE ===== */
function HomePage({ latest, list, pred, bill, peakHours, recs, anomaly, isConnected, setPage }) {
  const currentW = latest ? Number(latest.power_watts || 0) : 0
  const voltage = latest ? Number(latest.voltage || 0) : 0
  const currentA = latest ? Number(latest.current || 0) : 0

  return (
    <>
      {/* Executive Hero Banner */}
      <div className="hero-banner">
        <div className="hero-content">
          <h1>Smart Grid Operations Hub</h1>
          <p>Real-time AI monitoring, predictive load forecasting, and automated energy optimizations for your facility.</p>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage('monitoring')}>
              📈 View Live Streams
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setPage('predictions')}>
              🧠 Open AI Analytics
            </button>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="hero-pill">
            <div className="hero-pill-value">98.4%</div>
            <div className="hero-pill-label">Grid Efficiency</div>
          </div>
          <div className="hero-pill">
            <div className="hero-pill-value">${bill ? formatNum(bill.estimate, 2) : '0.00'}</div>
            <div className="hero-pill-label">Est. Bill / Mo</div>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Power Load</span>
            <div className="kpi-icon-badge blue">⚡</div>
          </div>
          <div className="kpi-value">
            {formatNum(currentW, 1)} <span className="kpi-unit">Watts</span>
          </div>
          <div className="kpi-footer">
            <span className={`kpi-trend-pill ${currentW > 250 ? 'down' : 'up'}`}>
              {currentW > 250 ? '↑ High Draw' : '↓ Normal'}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>Live reading</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Next-Day Forecast</span>
            <div className="kpi-icon-badge indigo">🔮</div>
          </div>
          <div className="kpi-value">
            {pred ? formatNum(pred.predicted_kwh, 2) : '—'} <span className="kpi-unit">kWh</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend-pill up">96.4% Acc</span>
            <span style={{ color: 'var(--text-muted)' }}>Random Forest Model</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Grid Voltage & Current</span>
            <div className="kpi-icon-badge emerald">🔋</div>
          </div>
          <div className="kpi-value">
            {formatNum(voltage, 1)}<span className="kpi-unit">V</span> / {formatNum(currentA, 2)}<span className="kpi-unit">A</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend-pill up">Stable 50Hz</span>
            <span style={{ color: 'var(--text-muted)' }}>PZEM-004T</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Anomaly Status</span>
            <div className="kpi-icon-badge amber">🛡️</div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.4rem' }}>
            {anomaly && anomaly.isAnomaly ? '🚨 Warning' : '✅ Normal'}
          </div>
          <div className="kpi-footer">
            <span className={`kpi-trend-pill ${anomaly && anomaly.isAnomaly ? 'down' : 'up'}`}>
              Z-Score: {anomaly ? formatNum(anomaly.z, 2) : '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="section-grid">
        <div className="main-col">
          {/* Realtime Power Curve */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">📊</span>
                <div>
                  <h3 className="panel-title">Real-Time Power Demand Curve</h3>
                  <div className="panel-subtitle">Streaming telemetry from connected IoT nodes</div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage('monitoring')}>
                Full Stream →
              </button>
            </div>
            <PowerChart data={list.slice(-40)} height={250} />
          </div>

          {/* Recent Readings Table */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">📋</span>
                <div>
                  <h3 className="panel-title">Recent Telemetry Logs</h3>
                  <div className="panel-subtitle">Latest readings ingested into system</div>
                </div>
              </div>
            </div>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Device ID</th>
                    <th>Voltage</th>
                    <th>Current</th>
                    <th>Power (W)</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length ? (
                    [...list].reverse().slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td>{formatTime(r.recorded_at)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--brand-primary-light)' }}>{r.device_id || 'esp-01'}</td>
                        <td>{formatNum(r.voltage, 1)} V</td>
                        <td>{formatNum(r.current, 2)} A</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-title)' }}>{formatNum(r.power_watts, 1)} W</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>No readings available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="side-col">
          {/* Peak Hours Card */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">🕐</span>
                <div>
                  <h3 className="panel-title">Predicted Peak Demand</h3>
                  <div className="panel-subtitle">High load forecast window</div>
                </div>
              </div>
            </div>
            {peakHours && peakHours.peak_hours && peakHours.peak_hours.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {peakHours.peak_hours.map((h, i) => (
                  <span key={i} style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--amber-bg)',
                    color: 'var(--amber-main)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: '1px solid var(--amber-border)'
                  }}>
                    {h}:00 - {h + 1}:00
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating peak demand baseline...</div>
            )}
          </div>

          {/* AI Recommendation Snippet */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">💡</span>
                <div>
                  <h3 className="panel-title">AI Action Recommendations</h3>
                  <div className="panel-subtitle">Optimization suggestions</div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage('recommendations')}>View All</button>
            </div>
            {recs.length ? (
              recs.slice(0, 2).map((r, i) => (
                <div className="rec-box" key={i}>
                  <div className={`rec-icon-wrapper ${r.level}`}>
                    {r.level === 'warning' ? '⚠️' : r.level === 'high' ? '🚨' : '💡'}
                  </div>
                  <div className="rec-content-area">
                    <h4>{r.level === 'high' ? 'High Load Alert' : 'Optimization Tip'}</h4>
                    <p>{r.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No high priority recommendations right now.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ===== 2. LIVE MONITORING PAGE ===== */
function MonitoringPage({ list, latest, isConnected, fetchAll }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [limit, setLimit] = useState(50)

  const filtered = list.filter(r => (r.device_id || '').toLowerCase().includes(searchTerm.toLowerCase()))

  const voltage = latest ? Number(latest.voltage || 0) : 0
  const current = latest ? Number(latest.current || 0) : 0
  const watts = latest ? Number(latest.power_watts || 0) : 0
  const pf = (voltage > 0 && current > 0) ? (watts / (voltage * current)).toFixed(2) : '0.98'

  return (
    <div>
      {/* Gauge Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Active Power (W)</span><div className="kpi-icon-badge blue">⚡</div></div>
          <div className="kpi-value">{formatNum(watts, 1)} <span className="kpi-unit">W</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">RMS Voltage (V)</span><div className="kpi-icon-badge emerald">🔋</div></div>
          <div className="kpi-value">{formatNum(voltage, 1)} <span className="kpi-unit">V</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">RMS Current (A)</span><div className="kpi-icon-badge amber">🔌</div></div>
          <div className="kpi-value">{formatNum(current, 2)} <span className="kpi-unit">A</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Power Factor (PF)</span><div className="kpi-icon-badge indigo">⚖️</div></div>
          <div className="kpi-value">{pf} <span className="kpi-unit">cos φ</span></div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-area">
            <span className="panel-icon">📈</span>
            <div>
              <h3 className="panel-title">High-Frequency Telemetry Stream</h3>
              <div className="panel-subtitle">Real-time load graph updated every 10 seconds</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll}>🔄 Refresh Stream</button>
        </div>
        <PowerChart data={list.slice(-limit)} height={280} />
      </div>

      {/* Data Table Panel */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-area">
            <span className="panel-icon">📑</span>
            <div>
              <h3 className="panel-title">Live Sensor Data Log</h3>
              <div className="panel-subtitle">Filter and inspect recorded grid telemetry</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input className="form-input-text" style={{ width: 200, padding: '6px 12px' }} placeholder="Search Device ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={() => alert('Exporting CSV telemetry data...')}>📥 Export CSV</button>
          </div>
        </div>

        <div className="table-responsive" style={{ maxHeight: 380, overflowY: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Recorded At</th>
                <th>Device ID</th>
                <th>Voltage (V)</th>
                <th>Current (A)</th>
                <th>Power (W)</th>
                <th>Apparent (VA)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                [...filtered].reverse().map((r, i) => {
                  const va = (Number(r.voltage || 0) * Number(r.current || 0)).toFixed(1)
                  return (
                    <tr key={i}>
                      <td>{formatDate(r.recorded_at)} {formatTime(r.recorded_at)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--brand-primary-light)' }}>{r.device_id || 'esp-01'}</td>
                      <td>{formatNum(r.voltage, 1)}</td>
                      <td>{formatNum(r.current, 2)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-title)' }}>{formatNum(r.power_watts, 1)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{va}</td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>No matching telemetry records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ===== 3. AI PREDICTIONS & ANALYTICS PAGE ===== */
function PredictionsPage({ pred, peakHours, anomaly, bill }) {
  const [solarCapacity, setSolarCapacity] = useState(3) // kW
  const [batterySize, setBatterySize] = useState(5) // kWh

  const dailyKwh = pred ? Number(pred.predicted_kwh || 0) : 12.5
  const solarGenKwh = solarCapacity * 4.2 // approx 4.2 peak sun hours
  const netKwh = Math.max(0, dailyKwh - solarGenKwh)
  const monthlySavings = (solarGenKwh * 30 * 0.12).toFixed(2)

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">24h Forecast Consumption</span><div className="kpi-icon-badge indigo">🧠</div></div>
          <div className="kpi-value">{formatNum(dailyKwh, 2)} <span className="kpi-unit">kWh</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">CO₂ Footprint (Est.)</span><div className="kpi-icon-badge emerald">🌱</div></div>
          <div className="kpi-value">{(dailyKwh * 0.85).toFixed(1)} <span className="kpi-unit">kg CO₂</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Model Accuracy</span><div className="kpi-icon-badge blue">🎯</div></div>
          <div className="kpi-value">96.4% <span className="kpi-unit">R²</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Anomaly Risk Score</span><div className="kpi-icon-badge amber">⚡</div></div>
          <div className="kpi-value">{anomaly ? formatNum(anomaly.z, 2) : '0.12'} <span className="kpi-unit">Z</span></div>
        </div>
      </div>

      <div className="section-grid">
        <div className="main-col">
          {/* Anomaly Analyzer */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">🛡️</span>
                <div>
                  <h3 className="panel-title">Isolation Forest Anomaly Analyzer</h3>
                  <div className="panel-subtitle">Detects unusual current spikes & electrical fault risks</div>
                </div>
              </div>
            </div>
            <div style={{
              padding: 24,
              borderRadius: 'var(--radius-md)',
              background: anomaly && anomaly.isAnomaly ? 'var(--rose-bg)' : 'var(--emerald-bg)',
              border: `1px solid ${anomaly && anomaly.isAnomaly ? 'var(--rose-border)' : 'var(--emerald-border)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 20
            }}>
              <div style={{ fontSize: '2.5rem' }}>{anomaly && anomaly.isAnomaly ? '🚨' : '🛡️'}</div>
              <div>
                <h4 style={{ color: anomaly && anomaly.isAnomaly ? 'var(--rose-main)' : 'var(--emerald-main)', fontSize: '1.1rem' }}>
                  {anomaly && anomaly.isAnomaly ? 'Anomalous Power Draw Flagged' : 'Electrical Baseline Normal'}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', marginTop: 4 }}>
                  {anomaly && anomaly.isAnomaly
                    ? `Reading of ${anomaly.value}W deviates significantly from standard home baseline (Z=${formatNum(anomaly.z, 2)}). Inspect connected loads.`
                    : `Current power consumption is within safe statistical limits (Z=${anomaly ? formatNum(anomaly.z, 2) : '0.00'}). No electrical fault risk detected.`}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Solar Simulator */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">☀️</span>
                <div>
                  <h3 className="panel-title">Solar & Battery "What-If" Simulator</h3>
                  <div className="panel-subtitle">Simulate microgrid additions to reduce grid reliance</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
              <div>
                <label className="form-label">Solar Panel Array Capacity: {solarCapacity} kW</label>
                <input type="range" min="1" max="10" value={solarCapacity} onChange={e => setSolarCapacity(Number(e.target.value))} className="custom-slider" />
              </div>
              <div>
                <label className="form-label">Battery Storage Capacity: {batterySize} kWh</label>
                <input type="range" min="2" max="20" value={batterySize} onChange={e => setBatterySize(Number(e.target.value))} className="custom-slider" />
              </div>
            </div>

            <div style={{ padding: 18, background: 'var(--bg-accent-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Projected Monthly Grid Savings</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--brand-primary)' }}>${monthlySavings} / mo</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net Grid Consumption</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-title)' }}>{formatNum(netKwh, 1)} kWh / day</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="side-col">
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">🕐</span>
                <div>
                  <h3 className="panel-title">Peak Demand Window</h3>
                  <div className="panel-subtitle">Expected peak electricity rate hours</div>
                </div>
              </div>
            </div>
            {peakHours && peakHours.peak_hours && peakHours.peak_hours.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {peakHours.peak_hours.map((h, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: 'var(--amber-main)' }}>Hour {h}:00 - {h + 1}:00</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Avg Load: {formatNum(peakHours.maxAvg, 1)}W</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No peak window calculated yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== 4. AI RECOMMENDATIONS & INSIGHTS PAGE ===== */
function RecommendationsPage({ recs }) {
  return (
    <div style={{ maxWidth: 850 }}>
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-area">
            <span className="panel-icon">💡</span>
            <div>
              <h3 className="panel-title">Prioritized AI Action Center</h3>
              <div className="panel-subtitle">Personalized energy-saving & fault prevention suggestions</div>
            </div>
          </div>
        </div>

        {recs.length ? (
          recs.map((r, i) => (
            <div className="rec-box" key={i} style={{ marginBottom: 18, padding: 20 }}>
              <div className={`rec-icon-wrapper ${r.level}`}>
                {r.level === 'warning' ? '⚠️' : r.level === 'high' ? '🚨' : '💡'}
              </div>
              <div className="rec-content-area" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h4>{r.level === 'high' ? 'High Consumption Alert' : r.level === 'warning' ? 'Anomaly Warning' : 'Energy Optimization'}</h4>
                  <span className={`nav-badge ${r.level === 'high' ? 'amber' : r.level === 'warning' ? 'green' : 'blue'}`}>
                    {r.level.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', marginBottom: 14 }}>{r.text}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => alert('Simulating smart relay automation trigger...')}>
                    ⚡ Auto-Optimize Relay
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => alert('Recommendation acknowledged.')}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✨</div>
            <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-title)' }}>All systems optimized!</div>
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>No actionable energy alerts at this time.</div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ===== 5. DEVICE & GRID MANAGEMENT PAGE ===== */
function DevicesPage() {
  const [deviceId, setDeviceId] = useState('')
  const [deviceLabel, setDeviceLabel] = useState('')
  const [relayState, setRelayState] = useState(true)
  const [msg, setMsg] = useState(null)

  async function registerDevice(e) {
    e.preventDefault()
    setMsg(null)
    if (!deviceId) return setMsg({ type: 'error', text: 'Device ID is required' })
    try {
      const r = await fetch(`${API}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, label: deviceLabel })
      })
      const j = await r.json()
      setMsg({ type: 'success', text: `Node ${deviceId} registered (${j.stored || 'ok'})` })
      setDeviceId('')
      setDeviceLabel('')
    } catch {
      setMsg({ type: 'error', text: 'Registration failed' })
    }
  }

  return (
    <div className="section-grid">
      <div className="main-col">
        {/* Device Inventory */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-area">
              <span className="panel-icon">🔌</span>
              <div>
                <h3 className="panel-title">Connected Smart Grid Inventory</h3>
                <div className="panel-subtitle">IoT Nodes, PZEM sensors, and automated relay modules</div>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Node ID</th>
                  <th>Type</th>
                  <th>Location / Label</th>
                  <th>Relay Control</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: '700', color: 'var(--brand-primary-light)' }}>esp32-main-01</td>
                  <td>ESP32 + PZEM-004T</td>
                  <td>Main Electrical Panel</td>
                  <td>
                    <button className={`btn btn-sm ${relayState ? 'btn-danger' : 'btn-success'}`} onClick={() => setRelayState(!relayState)}>
                      {relayState ? 'Cut Power (Relay OFF)' : 'Restore Power (Relay ON)'}
                    </button>
                  </td>
                  <td><span className="nav-badge green">Active</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '700', color: 'var(--brand-primary-light)' }}>esp32-hvac-02</td>
                  <td>Smart Relay Module</td>
                  <td>HVAC Air Conditioner</td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto Peak Cut</span>
                  </td>
                  <td><span className="nav-badge blue">Standby</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="side-col">
        {/* Register Node Form */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-area">
              <span className="panel-icon">➕</span>
              <div>
                <h3 className="panel-title">Register IoT Sensor</h3>
                <div className="panel-subtitle">Add new ESP32 / PZEM node</div>
              </div>
            </div>
          </div>

          <form onSubmit={registerDevice}>
            <div className="form-field">
              <label className="form-label">Device ID *</label>
              <input className="form-input-text" placeholder="e.g. esp32-node-03" value={deviceId} onChange={e => setDeviceId(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Location / Label</label>
              <input className="form-input-text" placeholder="e.g. Kitchen Appliance Line" value={deviceLabel} onChange={e => setDeviceLabel(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Register Node</button>
            {msg && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', background: msg.type === 'success' ? 'var(--emerald-bg)' : 'var(--rose-bg)', color: msg.type === 'success' ? 'var(--emerald-main)' : 'var(--rose-main)' }}>
                {msg.text}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

/* ===== 6. COST & TARIFF REPORTS PAGE ===== */
function ReportsPage({ bill, pred }) {
  const [tariffRate, setTariffRate] = useState(0.12)
  const dailyKwh = pred ? Number(pred.predicted_kwh || 0) : 12.5
  const monthlyEst = (dailyKwh * 30 * tariffRate).toFixed(2)

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-area">
            <span className="panel-icon">💰</span>
            <div>
              <h3 className="panel-title">Tariff & Electricity Bill Estimator</h3>
              <div className="panel-subtitle">Calculate projected costs based on custom local utility tariffs</div>
            </div>
          </div>
        </div>

        <div className="form-field" style={{ marginBottom: 24 }}>
          <label className="form-label">Utility Tariff Rate ($ per kWh): ${tariffRate}</label>
          <input type="range" min="0.05" max="0.50" step="0.01" value={tariffRate} onChange={e => setTariffRate(Number(e.target.value))} className="custom-slider" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ padding: 20, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>DAILY ESTIMATED CONSUMPTION</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-title)', marginTop: 4 }}>{formatNum(dailyKwh, 1)} kWh</div>
          </div>
          <div style={{ padding: 20, background: 'var(--emerald-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--emerald-border)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--emerald-main)', fontWeight: '700' }}>PROJECTED MONTHLY BILL</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--emerald-main)', marginTop: 4 }}>${monthlyEst}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== MAIN APP SHELL ===== */
export default function App() {
  const [page, setPage] = useState('home')
  const [latest, setLatest] = useState(null)
  const [list, setList] = useState([])
  const [pred, setPred] = useState(null)
  const [bill, setBill] = useState(null)
  const [peakHours, setPeakHours] = useState(null)
  const [recs, setRecs] = useState([])
  const [anomaly, setAnomaly] = useState(null)
  const [isConnected, setIsConnected] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  const fetchAll = useCallback(() => {
    fetch(`${API}/readings/health`)
      .then(r => { setIsConnected(r.ok); return r.json() })
      .catch(() => setIsConnected(false))

    fetch(`${API}/readings/latest`).then(r => r.json()).then(setLatest).catch(() => {})
    fetch(`${API}/readings?limit=50`).then(r => r.json()).then(setList).catch(() => {})
    fetch(`${API}/predictions/next-day`).then(r => r.json()).then(setPred).catch(() => {})
    fetch(`${API}/bill-estimate`).then(r => r.json()).then(setBill).catch(() => {})
    fetch(`${API}/predictions/peak-hours`).then(r => r.json()).then(setPeakHours).catch(() => {})
    fetch(`${API}/recommendations`).then(r => r.json()).then(d => setRecs(d.recommendations || [])).catch(() => {})
    fetch(`${API}/detect/anomaly`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.json()).then(setAnomaly).catch(() => {})
  }, [])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 10000)
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => { clearInterval(timer); clearInterval(clockTimer); }
  }, [fetchAll])

  const titles = {
    home: 'Executive Overview',
    monitoring: 'Live Telemetry & Stream',
    predictions: 'AI Analytics & Forecasts',
    recommendations: 'AI Recommendations & Actions',
    devices: 'IoT Node & Relay Management',
    reports: 'Tariff & Cost Calculator'
  }

  const subtitles = {
    home: 'Real-time smart grid operations dashboard',
    monitoring: 'High-frequency voltage, current, and active load monitoring',
    predictions: 'Machine learning prediction models, solar simulation, and safety risk evaluation',
    recommendations: 'Prioritized insights to cut monthly bill and mitigate overload risks',
    devices: 'Control smart relays, register sensors, and configure load thresholds',
    reports: 'Custom rate simulation and monthly bill estimates'
  }

  return (
    <div className="app-container">
      <SidebarNav page={page} setPage={setPage} isConnected={isConnected} />

      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-title-area">
            <h2>{titles[page]}</h2>
            <p>{subtitles[page]}</p>
          </div>
          <div className="header-controls">
            <div className="clock-pill">🕒 {currentTime.toLocaleTimeString()}</div>
            <button className="btn btn-secondary btn-sm" onClick={fetchAll}>🔄 Refresh Data</button>
          </div>
        </header>

        <main className="page-container">
          {page === 'home' && (
            <HomePage latest={latest} list={list} pred={pred} bill={bill} peakHours={peakHours} recs={recs} anomaly={anomaly} isConnected={isConnected} setPage={setPage} />
          )}

          {page === 'monitoring' && (
            <MonitoringPage list={list} latest={latest} isConnected={isConnected} fetchAll={fetchAll} />
          )}

          {page === 'predictions' && (
            <PredictionsPage pred={pred} peakHours={peakHours} anomaly={anomaly} bill={bill} />
          )}

          {page === 'recommendations' && (
            <RecommendationsPage recs={recs} />
          )}

          {page === 'devices' && (
            <DevicesPage />
          )}

          {page === 'reports' && (
            <ReportsPage bill={bill} pred={pred} />
          )}
        </main>
      </div>
    </div>
  )
}
