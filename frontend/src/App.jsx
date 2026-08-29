import React, { useEffect, useState, useCallback } from 'react'

const API = '/api'

/* ===== Utility Helpers ===== */
function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatNumber(n, decimals = 1) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toFixed(decimals)
}

/* ===== SVG Power Chart ===== */
function PowerChart({ data = [], height = 220 }) {
  if (!data.length) {
    return (
      <div className="empty-state" style={{ height }}>
        <div className="empty-icon">📊</div>
        <div>No chart data available yet</div>
      </div>
    )
  }

  const vals = data.map(d => Number(d.power_watts || 0))
  const maxVal = Math.max(...vals, 1) * 1.1
  const minVal = Math.min(...vals, 0)
  const range = maxVal - minVal || 1
  const w = 1000
  const h = 400
  const padTop = 20
  const padBot = 40
  const padLeft = 50
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

  // Grid lines
  const gridLines = 5
  const gridVals = Array.from({ length: gridLines }, (_, i) => minVal + (range * i) / (gridLines - 1))

  return (
    <div className="chart-container" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {gridVals.map((gv, i) => {
          const y = padTop + chartH - ((gv - minVal) / range) * chartH
          return (
            <g key={i}>
              <line x1={padLeft} y1={y} x2={w - padRight} y2={y}
                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <text x={padLeft - 8} y={y + 4} textAnchor="end"
                fill="#64748b" fontSize="22" fontFamily="Inter, sans-serif">
                {Math.round(gv)}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

        {/* Dots on last few points */}
        {points.slice(-5).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5"
            fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
        ))}

        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.max(Math.floor(data.length / 6), 1) === 0).map((d, i) => {
          const idx = data.indexOf(d)
          const x = padLeft + (idx / Math.max(data.length - 1, 1)) * chartW
          return (
            <text key={i} x={x} y={h - 8} textAnchor="middle"
              fill="#64748b" fontSize="20" fontFamily="Inter, sans-serif">
              {formatTime(d.recorded_at)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/* ===== Sidebar ===== */
function Sidebar({ activeTab, setActiveTab }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div>
          <div className="logo-text">PowerTrack</div>
          <div className="logo-badge">AI Powered</div>
        </div>
      </div>

      <div className="nav-section-label">Overview</div>
      <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}>
        <span className="nav-icon">📊</span> Dashboard
      </div>
      <div className={`nav-item ${activeTab === 'readings' ? 'active' : ''}`}
        onClick={() => setActiveTab('readings')}>
        <span className="nav-icon">📈</span> Readings
      </div>

      <div className="nav-section-label">AI & Analytics</div>
      <div className={`nav-item ${activeTab === 'predictions' ? 'active' : ''}`}
        onClick={() => setActiveTab('predictions')}>
        <span className="nav-icon">🔮</span> Predictions
      </div>
      <div className={`nav-item ${activeTab === 'recommendations' ? 'active' : ''}`}
        onClick={() => setActiveTab('recommendations')}>
        <span className="nav-icon">💡</span> Recommendations
      </div>

      <div className="nav-section-label">Management</div>
      <div className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
        onClick={() => setActiveTab('devices')}>
        <span className="nav-icon">🔌</span> Devices
      </div>

      <div style={{ flex: 1 }} />

      <div className="nav-item" style={{ opacity: 0.6 }}>
        <span className="nav-icon">⚙️</span> Settings
      </div>
    </nav>
  )
}

/* ===== Dashboard Page ===== */
function DashboardPage({ latest, list, pred, bill, peakHours, recs, anomaly, isOnline }) {
  return (
    <>
      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card fade-in">
          <div className="stat-header">
            <span className="stat-label">Current Power</span>
            <span className="stat-icon blue">⚡</span>
          </div>
          <div className="stat-value">
            {latest ? formatNumber(latest.power_watts, 1) : '—'}
            <span className="stat-unit">W</span>
          </div>
          <div className={`stat-change ${latest && latest.power_watts > 200 ? 'up' : 'down'}`}>
            {latest ? (latest.power_watts > 200 ? '↑ High' : '↓ Normal') : '—'}
          </div>
        </div>

        <div className="stat-card fade-in">
          <div className="stat-header">
            <span className="stat-label">Voltage</span>
            <span className="stat-icon green">🔋</span>
          </div>
          <div className="stat-value">
            {latest ? formatNumber(latest.voltage, 1) : '—'}
            <span className="stat-unit">V</span>
          </div>
          <div className="stat-change up">Stable</div>
        </div>

        <div className="stat-card fade-in">
          <div className="stat-header">
            <span className="stat-label">Current Draw</span>
            <span className="stat-icon amber">🔌</span>
          </div>
          <div className="stat-value">
            {latest ? formatNumber(latest.current, 2) : '—'}
            <span className="stat-unit">A</span>
          </div>
        </div>

        <div className="stat-card fade-in">
          <div className="stat-header">
            <span className="stat-label">Predicted Daily</span>
            <span className="stat-icon purple">🔮</span>
          </div>
          <div className="stat-value">
            {pred ? formatNumber(pred.predicted_kwh, 2) : '—'}
            <span className="stat-unit">kWh</span>
          </div>
        </div>

        <div className="stat-card fade-in">
          <div className="stat-header">
            <span className="stat-label">Est. Monthly Bill</span>
            <span className="stat-icon green">💰</span>
          </div>
          <div className="stat-value">
            ${bill ? formatNumber(bill.estimate, 2) : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {bill ? `${formatNumber(bill.monthly_kwh, 1)} kWh @ $${bill.tariff}/kWh` : ''}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        <div className="content-main">
          {/* Power Chart */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">
                  <span className="title-icon">📈</span> Power Consumption
                </div>
                <div className="card-subtitle">Last {list.length} readings</div>
              </div>
              <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                {isOnline ? 'Live' : 'Offline'}
              </span>
            </div>
            <PowerChart data={list.slice(-50)} />
          </div>

          {/* Readings Table */}
          <div className="card fade-in">
            <div className="card-header">
              <div>
                <div className="card-title">
                  <span className="title-icon">📋</span> Recent Readings
                </div>
                <div className="card-subtitle">Most recent sensor data</div>
              </div>
            </div>
            <div className="table-scroll">
              <table className="readings-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Device</th>
                    <th>Voltage (V)</th>
                    <th>Current (A)</th>
                    <th>Power (W)</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length ? (
                    [...list].reverse().slice(0, 15).map((r, i) => (
                      <tr key={i}>
                        <td>{formatTime(r.recorded_at)}</td>
                        <td style={{ color: 'var(--accent-cyan)' }}>{r.device_id || '—'}</td>
                        <td>{formatNumber(r.voltage, 1)}</td>
                        <td>{formatNumber(r.current, 2)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatNumber(r.power_watts, 1)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="empty-state">No readings yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="content-sidebar">
          {/* Anomaly Status */}
          <div className="card fade-in">
            <div className="card-header">
              <div className="card-title">
                <span className="title-icon">🛡️</span> System Health
              </div>
            </div>
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: anomaly && anomaly.isAnomaly ? 'var(--accent-red-glow)' : 'var(--accent-green-glow)',
              border: `1px solid ${anomaly && anomaly.isAnomaly ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>
                {anomaly && anomaly.isAnomaly ? '⚠️' : '✅'}
              </div>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: anomaly && anomaly.isAnomaly ? 'var(--accent-red)' : 'var(--accent-green)'
              }}>
                {anomaly && anomaly.isAnomaly ? 'Anomaly Detected' : 'All Systems Normal'}
              </div>
              {anomaly && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Z-Score: {formatNumber(anomaly.z, 2)}
                </div>
              )}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="card fade-in">
            <div className="card-header">
              <div className="card-title">
                <span className="title-icon">🕐</span> Peak Hours
              </div>
            </div>
            {peakHours && peakHours.peak_hours && peakHours.peak_hours.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {peakHours.peak_hours.map((h, i) => (
                  <span key={i} style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-amber-glow)',
                    color: 'var(--accent-amber)',
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}>
                    {h}:00
                  </span>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🕐</div>
                <div>No peak data yet</div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="card fade-in">
            <div className="card-header">
              <div className="card-title">
                <span className="title-icon">💡</span> AI Recommendations
              </div>
            </div>
            {recs.length ? (
              recs.map((r, i) => (
                <div className="rec-card" key={i}>
                  <div className={`rec-icon ${r.level}`}>
                    {r.level === 'warning' ? '⚠️' : r.level === 'high' ? '🔴' : 'ℹ️'}
                  </div>
                  <div>
                    <div className={`rec-level ${r.level}`}>{r.level}</div>
                    <div className="rec-text">{r.text}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💡</div>
                <div>No recommendations at this time</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ===== Devices Page ===== */
function DevicesPage() {
  const [deviceId, setDeviceId] = useState('')
  const [deviceLabel, setDeviceLabel] = useState('')
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
      setMsg({ type: 'success', text: `Device registered successfully (${j.stored || 'ok'})` })
      setDeviceId('')
      setDeviceLabel('')
    } catch {
      setMsg({ type: 'error', text: 'Registration failed. Please try again.' })
    }
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div className="card fade-in">
        <div className="card-header">
          <div className="card-title">
            <span className="title-icon">🔌</span> Register New Device
          </div>
        </div>
        <form onSubmit={registerDevice}>
          <div className="form-group">
            <label className="form-label">Device ID *</label>
            <input className="form-input" placeholder="e.g. esp32-001"
              value={deviceId} onChange={e => setDeviceId(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Label (optional)</label>
            <input className="form-input" placeholder="e.g. Living Room Sensor"
              value={deviceLabel} onChange={e => setDeviceLabel(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Register Device
          </button>
          {msg && <div className={`toast ${msg.type}`}>{msg.text}</div>}
        </form>
      </div>

      <div className="card fade-in" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">
            <span className="title-icon">⚙️</span> Quick Actions
          </div>
        </div>
        <button className="btn btn-secondary" style={{ width: '100%' }}
          onClick={() => {
            fetch(`${API}/ml/predict`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            })
              .then(r => r.json())
              .then(j => alert(JSON.stringify(j, null, 2)))
              .catch(() => alert('ML predict failed — is the ML service running?'))
          }}>
          🤖 Run ML Prediction
        </button>
      </div>
    </div>
  )
}

/* ===== Main App ===== */
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [latest, setLatest] = useState(null)
  const [list, setList] = useState([])
  const [pred, setPred] = useState(null)
  const [bill, setBill] = useState(null)
  const [peakHours, setPeakHours] = useState(null)
  const [recs, setRecs] = useState([])
  const [anomaly, setAnomaly] = useState(null)
  const [isOnline, setIsOnline] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchAll = useCallback(() => {
    // Health check
    fetch(`${API}/readings/health`)
      .then(r => { setIsOnline(r.ok); return r.json() })
      .catch(() => setIsOnline(false))

    // Latest reading
    fetch(`${API}/readings/latest`)
      .then(r => r.json())
      .then(setLatest)
      .catch(() => {})

    // Readings list
    fetch(`${API}/readings?limit=50`)
      .then(r => r.json())
      .then(setList)
      .catch(() => {})

    // Predictions
    fetch(`${API}/predictions/next-day`)
      .then(r => r.json())
      .then(setPred)
      .catch(() => {})

    // Bill estimate
    fetch(`${API}/bill-estimate`)
      .then(r => r.json())
      .then(setBill)
      .catch(() => {})

    // Peak hours
    fetch(`${API}/predictions/peak-hours`)
      .then(r => r.json())
      .then(setPeakHours)
      .catch(() => {})

    // Recommendations
    fetch(`${API}/recommendations`)
      .then(r => r.json())
      .then(d => setRecs(d.recommendations || []))
      .catch(() => {})

    // Anomaly check
    fetch(`${API}/detect/anomaly`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.json())
      .then(setAnomaly)
      .catch(() => {})

    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10000) // auto-refresh every 10s
    return () => clearInterval(interval)
  }, [fetchAll])

  const pageTitle = {
    dashboard: 'Dashboard',
    readings: 'Readings',
    predictions: 'AI Predictions',
    recommendations: 'Recommendations',
    devices: 'Device Management'
  }

  const pageSubtitle = {
    dashboard: 'Real-time energy monitoring & AI insights',
    readings: 'Historical sensor data',
    predictions: 'ML-powered consumption forecasting',
    recommendations: 'AI-generated energy-saving suggestions',
    devices: 'Register and manage IoT devices'
  }

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>{pageTitle[activeTab] || 'Dashboard'}</h1>
            <div className="subtitle">{pageSubtitle[activeTab]}</div>
          </div>
          <div className="header-actions">
            {lastRefresh && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Updated {formatTime(lastRefresh)}
              </span>
            )}
            <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
              🔄 Refresh
            </button>
            <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <DashboardPage
            latest={latest} list={list} pred={pred} bill={bill}
            peakHours={peakHours} recs={recs} anomaly={anomaly} isOnline={isOnline}
          />
        )}

        {activeTab === 'readings' && (
          <div className="content-main">
            <div className="card fade-in">
              <div className="card-header">
                <div>
                  <div className="card-title"><span className="title-icon">📈</span> Power Over Time</div>
                  <div className="card-subtitle">Full chart view</div>
                </div>
              </div>
              <PowerChart data={list} height={300} />
            </div>
            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title"><span className="title-icon">📋</span> All Readings</div>
              </div>
              <div className="table-scroll" style={{ maxHeight: 500 }}>
                <table className="readings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Device</th>
                      <th>Voltage (V)</th>
                      <th>Current (A)</th>
                      <th>Power (W)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...list].reverse().map((r, i) => (
                      <tr key={i}>
                        <td>{formatDate(r.recorded_at)}</td>
                        <td>{formatTime(r.recorded_at)}</td>
                        <td style={{ color: 'var(--accent-cyan)' }}>{r.device_id || '—'}</td>
                        <td>{formatNumber(r.voltage, 1)}</td>
                        <td>{formatNumber(r.current, 2)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatNumber(r.power_watts, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div style={{ maxWidth: 700 }}>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="stat-card fade-in">
                <div className="stat-header">
                  <span className="stat-label">Next-Day Forecast</span>
                  <span className="stat-icon purple">🔮</span>
                </div>
                <div className="stat-value">
                  {pred ? formatNumber(pred.predicted_kwh, 2) : '—'}
                  <span className="stat-unit">kWh</span>
                </div>
              </div>
              <div className="stat-card fade-in">
                <div className="stat-header">
                  <span className="stat-label">Monthly Estimate</span>
                  <span className="stat-icon green">💰</span>
                </div>
                <div className="stat-value">
                  ${bill ? formatNumber(bill.estimate, 2) : '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {bill ? `${formatNumber(bill.monthly_kwh, 1)} kWh/month` : ''}
                </div>
              </div>
            </div>

            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title"><span className="title-icon">🕐</span> Predicted Peak Hours</div>
              </div>
              {peakHours && peakHours.peak_hours && peakHours.peak_hours.length ? (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    {peakHours.peak_hours.map((h, i) => (
                      <span key={i} style={{
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-amber-glow)',
                        color: 'var(--accent-amber)',
                        fontWeight: 700,
                        fontSize: '1rem'
                      }}>
                        {h}:00 — {h + 1}:00
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Peak average: {formatNumber(peakHours.maxAvg, 1)} W
                  </p>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🕐</div>
                  <div>Insufficient data for peak prediction</div>
                </div>
              )}
            </div>

            <div className="card fade-in" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div className="card-title"><span className="title-icon">🛡️</span> Anomaly Detection</div>
              </div>
              <div style={{
                padding: 20,
                borderRadius: 'var(--radius-md)',
                background: anomaly && anomaly.isAnomaly ? 'var(--accent-red-glow)' : 'var(--accent-green-glow)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
                  {anomaly && anomaly.isAnomaly ? '🚨' : '✅'}
                </div>
                <div style={{
                  fontSize: '1.1rem', fontWeight: 700,
                  color: anomaly && anomaly.isAnomaly ? 'var(--accent-red)' : 'var(--accent-green)'
                }}>
                  {anomaly && anomaly.isAnomaly ? 'Anomaly Detected!' : 'No Anomalies Detected'}
                </div>
                {anomaly && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    Current value: {formatNumber(anomaly.value, 1)} W · Z-Score: {formatNumber(anomaly.z, 2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div style={{ maxWidth: 600 }}>
            {recs.length ? (
              recs.map((r, i) => (
                <div className="rec-card fade-in" key={i} style={{ marginBottom: 14 }}>
                  <div className={`rec-icon ${r.level}`} style={{ width: 42, height: 42, fontSize: '1.2rem' }}>
                    {r.level === 'warning' ? '⚠️' : r.level === 'high' ? '🔴' : '💡'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={`rec-level ${r.level}`} style={{ fontSize: '0.7rem' }}>{r.level}</div>
                    <div className="rec-text" style={{ fontSize: '0.88rem' }}>{r.text}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card fade-in">
                <div className="empty-state" style={{ padding: 48 }}>
                  <div className="empty-icon" style={{ fontSize: '3rem' }}>💡</div>
                  <div style={{ fontSize: '1rem', marginTop: 8 }}>No recommendations at this time</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Recommendations will appear when enough data is collected
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'devices' && <DevicesPage />}
      </main>
    </div>
  )
}
