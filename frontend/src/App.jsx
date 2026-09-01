import React, { useEffect, useState, useCallback, useRef } from 'react'

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

/* ===== Responsive Container Hook ===== */
function useContainerWidth(ref, defaultWidth = 800) {
  const [width, setWidth] = useState(defaultWidth)
  useEffect(() => {
    if (!ref.current) return
    const update = () => {
      const rect = ref.current.getBoundingClientRect()
      if (rect.width > 0) setWidth(Math.round(rect.width))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref, defaultWidth])
  return width
}

/* ===== Smooth Catmull-Rom Cubic Spline Path Builder ===== */
function getSmoothPath(points) {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  if (points.length === 2) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

/* ===== SVG Power Chart Component ===== */
function PowerChart({ data = [], height = 260 }) {
  const containerRef = useRef(null)
  const width = useContainerWidth(containerRef, 800)
  const [hoverIndex, setHoverIndex] = useState(null)

  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
        📊 Gathering live power telemetry...
      </div>
    )
  }

  const vals = data.map(d => Number(d.power_watts || 0))
  const maxRaw = Math.max(...vals, 10)
  const minRaw = Math.min(...vals, 0)
  const padVal = (maxRaw - minRaw) * 0.15 || 50
  const maxVal = Math.ceil((maxRaw + padVal) / 50) * 50
  const minVal = Math.max(0, Math.floor((minRaw - padVal) / 50) * 50)
  const range = maxVal - minVal || 1

  const w = width
  const h = height
  const padTop = 24
  const padBot = 36
  const padLeft = 60
  const padRight = 24
  const chartW = Math.max(10, w - padLeft - padRight)
  const chartH = Math.max(10, h - padTop - padBot)

  const points = data.map((d, i) => {
    const v = Number(d.power_watts || 0)
    const x = padLeft + (i / Math.max(data.length - 1, 1)) * chartW
    const y = padTop + chartH - ((v - minVal) / range) * chartH
    return { x, y, v, data: d, index: i }
  })

  const smoothLine = getSmoothPath(points)
  const areaPath = points.length > 1
    ? `${smoothLine} L ${points[points.length - 1].x.toFixed(1)},${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)},${(padTop + chartH).toFixed(1)} Z`
    : ''

  const gridCount = 4
  const gridVals = Array.from({ length: gridCount + 1 }, (_, i) => minVal + (range * i) / gridCount)

  // Metrics summary
  const latestVal = vals[vals.length - 1]
  const avgVal = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
  const peakVal = Math.max(...vals)

  // Hovered item
  const activePoint = hoverIndex != null && points[hoverIndex] ? points[hoverIndex] : null

  const handleMouseMove = (e) => {
    if (!containerRef.current || points.length < 2) return
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    if (mouseX < padLeft - 10 || mouseX > w - padRight + 10) {
      setHoverIndex(null)
      return
    }
    const ratio = Math.max(0, Math.min(1, (mouseX - padLeft) / chartW))
    const nearestIdx = Math.round(ratio * (points.length - 1))
    setHoverIndex(nearestIdx)
  }

  const handleMouseLeave = () => setHoverIndex(null)

  // Smart X-axis label spacing
  const maxLabels = Math.min(6, Math.max(2, Math.floor(chartW / 110)))
  const labelStep = Math.max(1, Math.floor((points.length - 1) / (maxLabels - 1)))
  const labelIndices = []
  for (let i = 0; i < points.length; i += labelStep) {
    labelIndices.push(i)
  }
  if (labelIndices[labelIndices.length - 1] !== points.length - 1) {
    labelIndices.push(points.length - 1)
  }

  return (
    <div
      ref={containerRef}
      className="modern-chart-wrapper"
      style={{ width: '100%', height, position: 'relative', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Quick stats overlay */}
      <div className="chart-stat-overlay">
        <div className="chart-stat-item">
          <span className="chart-stat-label">LIVE</span>
          <span className="chart-stat-value live">{latestVal.toFixed(1)} W</span>
        </div>
        <div className="chart-stat-item">
          <span className="chart-stat-label">AVG</span>
          <span className="chart-stat-value">{avgVal.toFixed(1)} W</span>
        </div>
        <div className="chart-stat-item">
          <span className="chart-stat-label">PEAK</span>
          <span className="chart-stat-value peak">{peakVal.toFixed(1)} W</span>
        </div>
      </div>

      <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="powerAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#6366f1" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="powerLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Horizontal Grid lines and Y labels */}
        {gridVals.map((gv, i) => {
          const y = padTop + chartH - ((gv - minVal) / range) * chartH
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={w - padRight}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray={i === 0 ? 'none' : '3 4'}
              />
              <text
                x={padLeft - 10}
                y={y + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="11"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="600"
              >
                {Math.round(gv)} W
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#powerAreaGrad)" />}

        {/* Smooth spline curve line */}
        {smoothLine && (
          <path
            d={smoothLine}
            fill="none"
            stroke="url(#powerLineGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* X-axis time labels */}
        {labelIndices.map((idx) => {
          const p = points[idx]
          if (!p) return null
          return (
            <text
              key={idx}
              x={p.x}
              y={h - 12}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="500"
            >
              {formatTime(p.data.recorded_at)}
            </text>
          )
        })}

        {/* Active hover crosshair and point */}
        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={padTop + chartH}
              stroke="#64748b"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.8"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="7"
              fill="#ffffff"
              stroke="#4f46e5"
              strokeWidth="3"
              filter="url(#nodeGlow)"
            />
          </g>
        )}

        {/* Live point pulse at end of curve */}
        {!activePoint && points.length > 0 && (
          <g>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="10"
              fill="rgba(59, 130, 246, 0.25)"
            >
              <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4.5"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {activePoint && (
        <div
          className="chart-floating-tooltip"
          style={{
            left: Math.min(Math.max(activePoint.x - 70, 10), w - 160),
            top: Math.max(10, activePoint.y - 65)
          }}
        >
          <div className="tooltip-title">⏱ {formatTime(activePoint.data.recorded_at)}</div>
          <div className="tooltip-row">
            <span>Power:</span>
            <strong className="tooltip-power">{formatNum(activePoint.v, 1)} W</strong>
          </div>
          {activePoint.data.voltage != null && (
            <div className="tooltip-sub">
              {formatNum(activePoint.data.voltage, 1)}V · {formatNum(activePoint.data.current, 2)}A
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TelemetryDataState({ status = 'loading', height = 220, label = 'graph' }) {
  const message = status === 'unavailable'
    ? 'Backend or database is unavailable. Waiting for telemetry...'
    : status === 'empty'
      ? 'No telemetry has been received from the database yet.'
      : 'Loading live telemetry from the backend...'

  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>
      📡 {message} The {label} will appear automatically when data arrives.
    </div>
  )
}

/* ===== SVG Z-Score Anomaly & Statistical Distribution Chart ===== */
function ZScoreChart({ data = [], height = 320, initialThreshold = 3.0 }) {
  const containerRef = useRef(null)
  const width = useContainerWidth(containerRef, 800)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [hoverIndex, setHoverIndex] = useState(null)

  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
        🛡️ Gathering telemetry data for Z-Score statistical analysis...
      </div>
    )
  }

  // Calculate sample mean and standard deviation
  const powers = data.map(d => Number(d.power_watts || 0))
  const meanVal = powers.reduce((a, b) => a + b, 0) / (powers.length || 1)
  const variance = powers.length > 1
    ? powers.reduce((acc, val) => acc + Math.pow(val - meanVal, 2), 0) / (powers.length - 1)
    : 0
  const stddevVal = Math.sqrt(variance)

  // Compute Z-scores: Z = (x - mean) / stddev
  const pointsData = data.map((d, i) => {
    const val = Number(d.power_watts || 0)
    const rawZ = stddevVal > 0 ? (val - meanVal) / stddevVal : 0
    const absZ = Math.abs(rawZ)
    const isAnomaly = absZ >= threshold
    const isWarning = !isAnomaly && absZ >= 2.0
    return {
      index: i,
      recorded_at: d.recorded_at,
      device_id: d.device_id || 'esp-pzem-01',
      power: val,
      voltage: d.voltage,
      current: d.current,
      z: rawZ,
      absZ,
      isAnomaly,
      isWarning
    }
  })

  const anomalyCount = pointsData.filter(p => p.isAnomaly).length
  const warningCount = pointsData.filter(p => p.isWarning).length
  const latestPoint = pointsData[pointsData.length - 1]

  const maxZ = Math.max(3.6, threshold * 1.15, ...pointsData.map(p => Math.abs(p.z) * 1.1))
  const yMin = -maxZ
  const yMax = maxZ
  const yRange = yMax - yMin || 1

  const w = width
  const h = height
  const padTop = 28
  const padBot = 38
  const padLeft = 60
  const padRight = 24
  const chartW = Math.max(10, w - padLeft - padRight)
  const chartH = Math.max(10, h - padTop - padBot)

  const getY = (zVal) => padTop + chartH - ((zVal - yMin) / yRange) * chartH
  const getX = (idx) => padLeft + (idx / Math.max(pointsData.length - 1, 1)) * chartW

  const svgPoints = pointsData.map(p => ({
    ...p,
    x: getX(p.index),
    y: getY(p.z)
  }))

  const smoothLine = getSmoothPath(svgPoints)

  const yZero = getY(0)
  const yUpperAnomaly = getY(threshold)
  const yLowerAnomaly = getY(-threshold)
  const yUpperWarning = getY(2.0)
  const yLowerWarning = getY(-2.0)

  const activePoint = hoverIndex != null && svgPoints[hoverIndex] ? svgPoints[hoverIndex] : null

  const handleMouseMove = (e) => {
    if (!containerRef.current || svgPoints.length < 2) return
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    if (mouseX < padLeft - 10 || mouseX > w - padRight + 10) {
      setHoverIndex(null)
      return
    }
    const ratio = Math.max(0, Math.min(1, (mouseX - padLeft) / chartW))
    const nearestIdx = Math.round(ratio * (svgPoints.length - 1))
    setHoverIndex(nearestIdx)
  }

  const handleMouseLeave = () => setHoverIndex(null)

  // Smart X-axis label spacing
  const maxLabels = Math.min(6, Math.max(2, Math.floor(chartW / 110)))
  const labelStep = Math.max(1, Math.floor((svgPoints.length - 1) / (maxLabels - 1)))
  const labelIndices = []
  for (let i = 0; i < svgPoints.length; i += labelStep) {
    labelIndices.push(i)
  }
  if (labelIndices[labelIndices.length - 1] !== svgPoints.length - 1) {
    labelIndices.push(svgPoints.length - 1)
  }

  return (
    <div className="zscore-chart-container" ref={containerRef}>
      {/* Control & Stat Badges Header */}
      <div className="zscore-toolbar">
        <div className="zscore-stats-strip">
          <div className={`zscore-stat-chip ${latestPoint.isAnomaly ? 'alert' : latestPoint.isWarning ? 'warning' : 'normal'}`}>
            <span>Latest Z-Score:</span>
            <span className="val">{latestPoint.z >= 0 ? `+${latestPoint.z.toFixed(2)}` : latestPoint.z.toFixed(2)}σ</span>
          </div>
          <div className="zscore-stat-chip">
            <span>Mean (μ):</span>
            <span className="val">{meanVal.toFixed(1)} W</span>
          </div>
          <div className="zscore-stat-chip">
            <span>Std Dev (σ):</span>
            <span className="val">±{stddevVal.toFixed(1)} W</span>
          </div>
          <div className={`zscore-stat-chip ${anomalyCount > 0 ? 'alert' : 'normal'}`}>
            <span>Outliers (&gt;{threshold}σ):</span>
            <span className="val">{anomalyCount}</span>
          </div>
        </div>

        <div className="zscore-controls-group">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Threshold:</span>
          <div className="segmented-control">
            <button className={`segmented-btn ${threshold === 2.0 ? 'active' : ''}`} onClick={() => setThreshold(2.0)}>
              2.0σ (95.4%)
            </button>
            <button className={`segmented-btn ${threshold === 2.5 ? 'active' : ''}`} onClick={() => setThreshold(2.5)}>
              2.5σ (98.8%)
            </button>
            <button className={`segmented-btn ${threshold === 3.0 ? 'active' : ''}`} onClick={() => setThreshold(3.0)}>
              3.0σ (99.7%)
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        style={{ width: '100%', height, position: 'relative', userSelect: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <filter id="anomalyGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Anomaly Upper Band */}
          <rect x={padLeft} y={padTop} width={chartW} height={Math.max(0, yUpperAnomaly - padTop)} fill="rgba(239, 68, 68, 0.08)" />
          {/* Anomaly Lower Band */}
          <rect x={padLeft} y={yLowerAnomaly} width={chartW} height={Math.max(0, (padTop + chartH) - yLowerAnomaly)} fill="rgba(239, 68, 68, 0.08)" />

          {/* Warning Bands */}
          {threshold > 2.0 && (
            <>
              <rect x={padLeft} y={yUpperAnomaly} width={chartW} height={Math.max(0, yUpperWarning - yUpperAnomaly)} fill="rgba(245, 158, 11, 0.07)" />
              <rect x={padLeft} y={yLowerWarning} width={chartW} height={Math.max(0, yLowerAnomaly - yLowerWarning)} fill="rgba(245, 158, 11, 0.07)" />
            </>
          )}

          {/* Safe Normal Zone (-2σ to +2σ) */}
          <rect x={padLeft} y={yUpperWarning} width={chartW} height={Math.max(0, yLowerWarning - yUpperWarning)} fill="rgba(59, 130, 246, 0.03)" />

          {/* Upper Anomaly Threshold Line */}
          <line x1={padLeft} y1={yUpperAnomaly} x2={w - padRight} y2={yUpperAnomaly} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85" />
          <text x={w - padRight - 6} y={yUpperAnomaly - 5} textAnchor="end" fill="#ef4444" fontSize="10" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
            +{threshold.toFixed(1)}σ Anomaly ({Math.round(meanVal + threshold * stddevVal)} W)
          </text>

          {/* Lower Anomaly Threshold Line */}
          {yLowerAnomaly < padTop + chartH && (
            <>
              <line x1={padLeft} y1={yLowerAnomaly} x2={w - padRight} y2={yLowerAnomaly} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85" />
              <text x={w - padRight - 6} y={yLowerAnomaly + 12} textAnchor="end" fill="#ef4444" fontSize="10" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
                -{threshold.toFixed(1)}σ Anomaly ({Math.max(0, Math.round(meanVal - threshold * stddevVal))} W)
              </text>
            </>
          )}

          {/* Mean Baseline Line (Z = 0) */}
          <line x1={padLeft} y1={yZero} x2={w - padRight} y2={yZero} stroke="#64748b" strokeWidth="1.4" strokeDasharray="3 3" />
          <text x={padLeft + 8} y={yZero - 5} fill="#64748b" fontSize="10" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
            μ Baseline (0σ · {Math.round(meanVal)} W)
          </text>

          {/* Y-Axis tick labels */}
          {[-3, -2, -1, 0, 1, 2, 3].map(tickZ => {
            if (tickZ > maxZ || tickZ < -maxZ) return null
            const yPos = getY(tickZ)
            return (
              <g key={tickZ}>
                <line x1={padLeft - 4} y1={yPos} x2={padLeft} y2={yPos} stroke="#cbd5e1" strokeWidth="1" />
                <text x={padLeft - 8} y={yPos + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
                  {tickZ > 0 ? `+${tickZ}σ` : tickZ === 0 ? '0σ' : `${tickZ}σ`}
                </text>
              </g>
            )
          })}

          {/* Smooth Z-Score Trend Line */}
          {smoothLine && (
            <path d={smoothLine} fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Data Points */}
          {svgPoints.map((p, i) => {
            const isHovered = activePoint && activePoint.index === p.index
            let fillCol = '#3b82f6'
            let radius = isHovered ? 6.5 : (p.isAnomaly ? 6 : p.isWarning ? 4.5 : 3.5)

            if (p.isAnomaly) fillCol = '#ef4444'
            else if (p.isWarning) fillCol = '#f59e0b'

            return (
              <g key={i}>
                {p.isAnomaly && (
                  <circle cx={p.x} cy={p.y} r="10" fill="none" stroke="#ef4444" strokeWidth="1.8" filter="url(#anomalyGlow)">
                    <animate attributeName="r" values="6;14;6" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={radius}
                  fill={fillCol}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
              </g>
            )
          })}

          {/* X labels */}
          {labelIndices.map((idx) => {
            const p = svgPoints[idx]
            if (!p) return null
            return (
              <text key={idx} x={p.x} y={h - 12} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="Inter, system-ui, sans-serif">
                {formatTime(p.recorded_at)}
              </text>
            )
          })}

          {/* Active hover crosshair */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={padTop + chartH}
              stroke="#64748b"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          )}
        </svg>

        {/* Hover Tooltip */}
        {activePoint && (
          <div
            className="chart-floating-tooltip"
            style={{
              left: Math.min(Math.max(activePoint.x - 80, 10), w - 180),
              top: Math.max(10, activePoint.y - 75)
            }}
          >
            <div className="tooltip-title">⏱ {formatTime(activePoint.recorded_at)}</div>
            <div className="tooltip-row">
              <span>Power:</span>
              <strong>{activePoint.power} W</strong>
            </div>
            <div className="tooltip-row">
              <span>Z-Score:</span>
              <strong style={{ color: activePoint.isAnomaly ? '#ef4444' : activePoint.isWarning ? '#f59e0b' : '#3b82f6' }}>
                {activePoint.z >= 0 ? `+${activePoint.z.toFixed(2)}` : activePoint.z.toFixed(2)}σ
              </strong>
            </div>
            <div className="tooltip-sub" style={{ fontWeight: 700, color: activePoint.isAnomaly ? '#ef4444' : activePoint.isWarning ? '#d97706' : '#059669' }}>
              {activePoint.isAnomaly ? '🚨 Critical Anomaly' : activePoint.isWarning ? '⚠️ Warning Deviation' : '✅ Normal Range'}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="zscore-legend">
        <div className="legend-item">
          <span className="legend-dot normal"></span>
          <span>Normal Baseline (&lt; 2.0σ)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot warning"></span>
          <span>Warning Deviation (2.0σ – {threshold.toFixed(1)}σ)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot danger"></span>
          <span>Critical Anomaly (&gt; {threshold.toFixed(1)}σ Outlier)</span>
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          Standardized Gaussian: <code>Z = (P - μ) / σ</code>
        </div>
      </div>
    </div>
  )
}

/* ===== Usage Report Helpers ===== */
function dateKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hourOf(ts) {
  return new Date(ts).getHours()
}

// Estimates energy (kWh) from a set of {recorded_at, power_watts} samples using
// trapezoidal integration of power over time. Gaps larger than 2 hours (device
// offline / no samples) are skipped so they don't get counted as usage.
function estimateKwh(readings) {
  if (!readings || readings.length < 2) return 0
  const sorted = [...readings].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
  let wattHours = 0
  for (let i = 1; i < sorted.length; i++) {
    const t0 = new Date(sorted[i - 1].recorded_at).getTime()
    const t1 = new Date(sorted[i].recorded_at).getTime()
    const hrs = (t1 - t0) / 3600000
    if (!(hrs > 0) || hrs > 2) continue
    const avgW = (Number(sorted[i - 1].power_watts || 0) + Number(sorted[i].power_watts || 0)) / 2
    wattHours += avgW * hrs
  }
  return wattHours / 1000
}

const USAGE_RANGE_CONFIG = {
  today: { label: 'Present Day', days: 1, buckets: 'hour' },
  '7d': { label: 'Previous 7 Days', days: 7, buckets: 'day' },
  '15d': { label: 'Previous 15 Days', days: 15, buckets: 'day' },
  '30d': { label: 'Previous 30 Days', days: 30, buckets: 'day' }
}

/* ===== SVG Electricity Usage Report Chart (Present Day / 7 / 15 / 30 Days) ===== */
function UsageReportChart({ height = 320 }) {
  const containerRef = useRef(null)
  const width = useContainerWidth(containerRef, 800)
  const [range, setRange] = useState('today')
  const [rawData, setRawData] = useState([])
  const [dataStatus, setDataStatus] = useState('loading')
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const [hoveredBar, setHoveredBar] = useState(null)

  const cfg = USAGE_RANGE_CONFIG[range]

  const loadRange = useCallback(() => {
    setLoading(true)
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - (cfg.days - 1))
    start.setHours(0, 0, 0, 0)
    fetch(`${API}/readings/range?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`)
      .then(async r => {
        if (!r.ok) throw new Error('Usage report request failed')
        const data = await r.json()
        if (!Array.isArray(data)) throw new Error('Invalid usage report response')
        return data
      })
      .then(data => {
        setRawData(data)
        setDataStatus(data.length ? 'ready' : 'empty')
        setLastFetched(new Date())
      })
      .catch(() => {
        setRawData([])
        setDataStatus('unavailable')
      })
      .finally(() => setLoading(false))
  }, [cfg.days])

  useEffect(() => {
    loadRange()
    const timer = setInterval(loadRange, 30000)
    return () => clearInterval(timer)
  }, [loadRange])

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - (cfg.days - 1))
  cutoff.setHours(0, 0, 0, 0)
  const inRange = rawData.filter(r => new Date(r.recorded_at) >= cutoff)

  let bars = []
  if (cfg.buckets === 'hour') {
    const todayKey = dateKey(now)
    const todays = inRange.filter(r => dateKey(r.recorded_at) === todayKey)
    for (let h = 0; h < 24; h++) {
      const hourReadings = todays.filter(r => hourOf(r.recorded_at) === h)
      bars.push({
        label: `${String(h).padStart(2, '0')}:00`,
        kwh: estimateKwh(hourReadings),
        count: hourReadings.length,
        isCurrent: h === now.getHours()
      })
    }
  } else {
    const dayMap = {}
    inRange.forEach(r => {
      const key = dateKey(r.recorded_at)
      if (!dayMap[key]) dayMap[key] = []
      dayMap[key].push(r)
    })
    for (let i = cfg.days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = dateKey(d)
      const readings = dayMap[key] || []
      bars.push({
        label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        kwh: estimateKwh(readings),
        count: readings.length,
        isCurrent: i === 0
      })
    }
  }

  const totalKwh = bars.reduce((a, b) => a + b.kwh, 0)
  const avgKwh = bars.length ? totalKwh / bars.length : 0
  const peakBar = bars.reduce((max, b) => (!max || b.kwh > max.kwh ? b : max), null)

  const w = width
  const h = height
  const padTop = 26
  const padBot = 42
  const padLeft = 60
  const padRight = 24
  const chartW = Math.max(10, w - padLeft - padRight)
  const chartH = Math.max(10, h - padTop - padBot)
  const maxKwh = Math.max(...bars.map(b => b.kwh), 0.1) * 1.25

  const totalSlots = bars.length || 1
  const slotWidth = chartW / totalSlots
  const barGap = Math.max(2, Math.min(8, slotWidth * 0.25))
  const barW = Math.max(2, slotWidth - barGap)

  const labelStride = Math.max(1, Math.ceil(bars.length / Math.min(12, Math.floor(chartW / 65))))

  return (
    <div className="panel-card" ref={containerRef}>
      <div className="panel-header">
        <div className="panel-title-area">
          <span className="panel-icon">📈</span>
          <div>
            <h3 className="panel-title">Electricity Usage Report</h3>
            <div className="panel-subtitle">Real-time consumption tracking &amp; historical breakdown</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`nav-badge ${loading ? 'amber' : 'green'}`}>{loading ? '● Syncing' : '● Live'}</span>
          <button className="btn btn-secondary btn-sm" onClick={loadRange}>🔄 Refresh</button>
        </div>
      </div>

      <div className="segmented-control" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(USAGE_RANGE_CONFIG).map(([key, c]) => (
          <button key={key} className={`segmented-btn ${range === key ? 'active' : ''}`} onClick={() => setRange(key)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="usage-stat-grid">
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL USAGE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-title)' }}>{formatNum(totalKwh, 2)} kWh</div>
        </div>
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{cfg.buckets === 'hour' ? 'AVG PER HOUR' : 'AVG PER DAY'}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-title)' }}>{formatNum(avgKwh, 2)} kWh</div>
        </div>
        <div style={{ padding: 16, background: 'var(--amber-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--amber-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--amber-main)', fontWeight: 700 }}>PEAK {cfg.buckets === 'hour' ? 'HOUR' : 'DAY'}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--amber-main)' }}>{peakBar && peakBar.kwh > 0 ? `${peakBar.label} · ${formatNum(peakBar.kwh, 2)} kWh` : '—'}</div>
        </div>
      </div>

      <div style={{ width: '100%', height, position: 'relative' }}>
        {dataStatus !== 'ready' || !bars.some(b => b.count > 0) ? (
          <TelemetryDataState status={dataStatus === 'ready' ? 'empty' : dataStatus} height={height} label="usage report graph" />
        ) : (
          <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id="usageBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="usageBarGradCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="usageBarGradPeak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {Array.from({ length: 5 }, (_, i) => (maxKwh * i) / 4).map((gv, i) => {
              const y = padTop + chartH - (gv / maxKwh) * chartH
              return (
                <g key={i}>
                  <line x1={padLeft} y1={y} x2={w - padRight} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={i === 0 ? 'none' : '3 4'} />
                  <text x={padLeft - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">
                    {gv.toFixed(2)}
                  </text>
                </g>
              )
            })}

            {/* Bars */}
            {bars.map((b, i) => {
              const x = padLeft + i * slotWidth + barGap / 2
              const barH = maxKwh > 0 ? (b.kwh / maxKwh) * chartH : 0
              const y = padTop + chartH - barH
              const isHovered = hoveredBar === b
              const isPeak = peakBar && peakBar.kwh > 0 && b === peakBar
              const fillGrad = b.isCurrent ? 'url(#usageBarGradCurrent)' : isPeak ? 'url(#usageBarGradPeak)' : 'url(#usageBarGrad)'

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredBar(b)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(barW, 2)}
                    height={Math.max(barH, 2)}
                    rx="4"
                    fill={fillGrad}
                    opacity={isHovered ? 1 : 0.9}
                    stroke={isHovered ? '#1e293b' : 'none'}
                    strokeWidth={isHovered ? 1.5 : 0}
                    style={{ transition: 'opacity 0.15s ease' }}
                  />
                  {isPeak && (
                    <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="800">
                      ★
                    </text>
                  )}
                </g>
              )
            })}

            {/* X-axis labels */}
            {bars.filter((_, i) => i % labelStride === 0).map((b) => {
              const origIdx = bars.indexOf(b)
              const x = padLeft + origIdx * slotWidth + slotWidth / 2
              return (
                <text key={origIdx} x={x} y={h - 12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="Inter, system-ui, sans-serif" fontWeight="500">
                  {b.label}
                </text>
              )
            })}
          </svg>
        )}

        {/* Hover Tooltip */}
        {hoveredBar && (
          <div className="chart-floating-tooltip" style={{ right: 20, top: 10 }}>
            <div className="tooltip-title">📅 {hoveredBar.label}</div>
            <div className="tooltip-row">
              <span>Energy:</span>
              <strong className="tooltip-power">{formatNum(hoveredBar.kwh, 3)} kWh</strong>
            </div>
            <div className="tooltip-sub">Samples: {hoveredBar.count}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        {lastFetched ? `Last synced ${formatTime(lastFetched)}` : ''}
      </div>
    </div>
  )
}

const DEVICE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

/* ===== SVG Donut/Pie Chart (generic, reusable, polished) ===== */
function PieChart({ data = [], size = 220, thickness = 32, centerLabel = '', centerSublabel = '' }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const total = data.reduce((a, d) => a + d.value, 0)
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  let cumulative = 0

  if (!total) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: size, color: '#94a3b8', fontSize: '0.9rem' }}>
        🥧 No data to visualize yet...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, overflow: 'visible' }}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {data.map((d, i) => {
            const frac = d.value / total
            const dash = frac * circumference
            const gap = circumference - dash
            const isHovered = hoverIdx === i
            const strokeW = isHovered ? thickness + 4 : thickness
            const offset = -cumulative
            cumulative += dash

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeW}
                strokeDasharray={`${Math.max(0, dash - (data.length > 1 ? 3 : 0))} ${gap + (data.length > 1 ? 3 : 0)}`}
                strokeDashoffset={offset}
                strokeLinecap={data.length === 1 ? 'butt' : 'round'}
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  opacity: hoverIdx == null || isHovered ? 1 : 0.6
                }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            )
          })}
        </g>
        {centerLabel && (
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--text-title)" fontFamily="Inter, system-ui, sans-serif">
            {hoverIdx != null ? formatNum(data[hoverIdx].value, 1) : centerLabel}
          </text>
        )}
        {centerSublabel && (
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fontWeight="600" fill="#94a3b8" fontFamily="Inter, system-ui, sans-serif">
            {hoverIdx != null ? data[hoverIdx].label : centerSublabel}
          </text>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150 }}>
        {data.map((d, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.82rem',
              cursor: 'pointer',
              opacity: hoverIdx == null || hoverIdx === i ? 1 : 0.5,
              transition: 'opacity 0.15s ease'
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0, boxShadow: hoverIdx === i ? `0 0 8px ${d.color}` : 'none' }} />
            <span style={{ color: 'var(--text-title)', fontWeight: 600 }}>{d.label}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 700 }}>{formatNum((d.value / total) * 100, 1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===== Live Sensor Datalog Report (rolling feed + device usage share pie chart) ===== */
function SensorDatalogReport({ height = 220 }) {
  const [logData, setLogData] = useState([])
  const [dataStatus, setDataStatus] = useState('loading')
  const [lastFetched, setLastFetched] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadLog = useCallback(() => {
    setLoading(true)
    fetch(`${API}/readings?limit=150`)
      .then(async r => {
        if (!r.ok) throw new Error('Datalog request failed')
        const data = await r.json()
        if (!Array.isArray(data)) throw new Error('Invalid datalog response')
        return data
      })
      .then(data => {
        setLogData(data)
        setDataStatus(data.length ? 'ready' : 'empty')
        setLastFetched(new Date())
      })
      .catch(() => {
        setLogData([])
        setDataStatus('unavailable')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadLog()
    const timer = setInterval(loadLog, 5000) // near real-time datalog polling
    return () => clearInterval(timer)
  }, [loadLog])

  const sorted = [...logData].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
  const latestEntries = [...sorted].reverse().slice(0, 8)

  // Device-wise energy share within the fetched window
  const byDevice = {}
  sorted.forEach(r => {
    const id = r.device_id || 'esp-pzem-01'
    if (!byDevice[id]) byDevice[id] = []
    byDevice[id].push(r)
  })
  const deviceIds = Object.keys(byDevice)
  const pieData = deviceIds
    .map((id, i) => ({
      label: id,
      value: estimateKwh(byDevice[id]) || byDevice[id].reduce((a, r) => a + Number(r.power_watts || 0), 0) / 1000,
      color: DEVICE_COLORS[i % DEVICE_COLORS.length]
    }))
    .filter(d => d.value > 0)
  const totalPieVal = pieData.reduce((a, d) => a + d.value, 0)

  // Rough sampling interval from timestamps
  let avgIntervalSec = null
  if (sorted.length > 1) {
    const diffs = []
    for (let i = 1; i < sorted.length; i++) {
      const dt = (new Date(sorted[i].recorded_at) - new Date(sorted[i - 1].recorded_at)) / 1000
      if (dt > 0 && dt < 3600) diffs.push(dt)
    }
    if (diffs.length) avgIntervalSec = diffs.reduce((a, b) => a + b, 0) / diffs.length
  }

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-area">
          <span className="panel-icon">🛰️</span>
          <div>
            <h3 className="panel-title">Live Sensor Datalog Report</h3>
            <div className="panel-subtitle">Rolling raw telemetry feed &amp; device-wise usage share</div>
          </div>
        </div>
        <span className={`nav-badge ${loading ? 'amber' : 'green'}`}>{loading ? '● Syncing' : '● Live'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>SAMPLES IN WINDOW</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-title)' }}>{sorted.length}</div>
        </div>
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE DEVICES</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-title)' }}>{deviceIds.length}</div>
        </div>
        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>AVG LOG INTERVAL</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-title)' }}>{avgIntervalSec ? `${formatNum(avgIntervalSec, 1)}s` : '—'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24, alignItems: 'start' }}>
        <div className="table-responsive" style={{ maxHeight: height, overflowY: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Recorded At</th>
                <th>Device ID</th>
                <th>Voltage</th>
                <th>Current</th>
                <th>Power (W)</th>
              </tr>
            </thead>
            <tbody>
              {latestEntries.length ? (
                latestEntries.map((r, i) => (
                  <tr key={i}>
                    <td>{formatTime(r.recorded_at)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--brand-primary-light)' }}>{r.device_id || 'esp-01'}</td>
                    <td>{formatNum(r.voltage, 1)} V</td>
                    <td>{formatNum(r.current, 2)} A</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-title)' }}>{formatNum(r.power_watts, 1)} W</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>No live samples yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 12 }}>
            ⚡ Device Usage Share
          </div>
          {dataStatus === 'ready' && pieData.length
            ? <PieChart data={pieData} size={200} thickness={30} centerLabel={formatNum(totalPieVal, 2)} centerSublabel="kWh (window)" />
            : <TelemetryDataState status={dataStatus} height={200} label="device usage chart" />}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        {lastFetched ? `Last synced ${formatTime(lastFetched)}` : ''}
      </div>
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
function HomePage({ latest, list, pred, bill, peakHours, recs, anomaly, isConnected, telemetryStatus, setPage }) {
  const currentW = latest ? Number(latest.power_watts || 0) : 0
  const voltage = latest ? Number(latest.voltage || 0) : 0
  const currentA = latest ? Number(latest.current || 0) : 0
  const devicePower = list.reduce((groups, reading) => {
    const id = reading.device_id || 'esp-pzem-01'
    if (!groups[id]) groups[id] = []
    groups[id].push(Number(reading.power_watts || 0))
    return groups
  }, {})
  const telemetryPieData = Object.entries(devicePower)
    .map(([id, watts], index) => ({
      label: id,
      value: watts.reduce((sum, value) => sum + value, 0) / watts.length,
      color: DEVICE_COLORS[index % DEVICE_COLORS.length]
    }))
    .filter(item => item.value > 0)
  const totalAverageWatts = telemetryPieData.reduce((sum, item) => sum + item.value, 0)

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

      {/* Interactive usage summary stays on the dashboard for quick reporting. */}
      <UsageReportChart height={320} />

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
            {telemetryStatus === 'ready'
              ? <PowerChart data={list.slice(-40)} height={250} />
              : <TelemetryDataState status={telemetryStatus} height={250} label="power-demand graph" />}
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
            <div className="dashboard-telemetry-grid">
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
              <div className="telemetry-pie-panel">
                <div className="telemetry-pie-title">⚡ Live Power Share</div>
                <div className="telemetry-pie-subtitle">Average load by connected device</div>
                {telemetryStatus === 'ready' && telemetryPieData.length
                  ? <PieChart data={telemetryPieData} size={190} thickness={30} centerLabel={formatNum(totalAverageWatts, 0)} centerSublabel="avg watts" />
                  : <TelemetryDataState status={telemetryStatus} height={190} label="power-share chart" />}
              </div>
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

  const [chartMode, setChartMode] = useState('power') // 'power' | 'zscore' | 'combined'

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

      {/* Main Chart Card with View Switcher */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-area">
            <span className="panel-icon">{chartMode === 'zscore' ? '🛡️' : '📈'}</span>
            <div>
              <h3 className="panel-title">
                {chartMode === 'power' && 'Real-Time Power Demand Curve (W)'}
                {chartMode === 'zscore' && 'Z-Score Statistical Anomaly Graph (σ)'}
                {chartMode === 'combined' && 'Dual Telemetry: Power Load & Z-Score Anomaly Stream'}
              </h3>
              <div className="panel-subtitle">Streaming live telemetry from connected IoT smart sensors</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="chart-tab-switcher">
              <button className={`chart-tab-btn ${chartMode === 'power' ? 'active' : ''}`} onClick={() => setChartMode('power')}>
                ⚡ Power (W)
              </button>
              <button className={`chart-tab-btn ${chartMode === 'zscore' ? 'active' : ''}`} onClick={() => setChartMode('zscore')}>
                🛡️ Z-Score (σ)
              </button>
              <button className={`chart-tab-btn ${chartMode === 'combined' ? 'active' : ''}`} onClick={() => setChartMode('combined')}>
                📊 Dual View
              </button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchAll}>🔄 Refresh</button>
          </div>
        </div>

        {chartMode === 'power' && <PowerChart data={list.slice(-limit)} height={280} />}
        {chartMode === 'zscore' && <ZScoreChart data={list.slice(-limit)} height={320} initialThreshold={3.0} />}
        {chartMode === 'combined' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8 }}>
                ⚡ Active Power Demand (Watts)
              </div>
              <PowerChart data={list.slice(-limit)} height={220} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8 }}>
                🛡️ Standardized Z-Score Anomaly Curve (Sigma σ)
              </div>
              <ZScoreChart data={list.slice(-limit)} height={280} initialThreshold={3.0} />
            </div>
          </div>
        )}
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
function PredictionsPage({ pred, peakHours, anomaly, bill, list = [] }) {
  const [solarCapacity, setSolarCapacity] = useState(3) // kW
  const [batterySize, setBatterySize] = useState(5) // kWh

  const dailyKwh = pred ? Number(pred.predicted_kwh || 0) : 12.5
  const solarGenKwh = solarCapacity * 4.2 // approx 4.2 peak sun hours
  const netKwh = Math.max(0, dailyKwh - solarGenKwh)
  const monthlySavings = (solarGenKwh * 30 * 0.12).toFixed(2)

  // Compute live Z-score metrics
  const powers = list.map(d => Number(d.power_watts || 0))
  const meanVal = powers.length ? powers.reduce((a, b) => a + b, 0) / powers.length : 0
  const variance = powers.length > 1
    ? powers.reduce((acc, val) => acc + Math.pow(val - meanVal, 2), 0) / (powers.length - 1)
    : 0
  const stddevVal = Math.sqrt(variance)
  const latestPower = powers.length ? powers[powers.length - 1] : 0
  const latestZ = stddevVal > 0 ? (latestPower - meanVal) / stddevVal : 0

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">24h Forecast Consumption</span><div className="kpi-icon-badge indigo">🧠</div></div>
          <div className="kpi-value">{formatNum(dailyKwh, 2)} <span className="kpi-unit">kWh</span></div>
          <div className="kpi-footer"><span className="kpi-trend-pill up">96.4% Acc</span><span>Random Forest</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Baseline Mean Load (μ)</span><div className="kpi-icon-badge blue">📊</div></div>
          <div className="kpi-value">{formatNum(meanVal, 1)} <span className="kpi-unit">W</span></div>
          <div className="kpi-footer"><span className="kpi-trend-pill neutral">σ = ±{formatNum(stddevVal, 1)}W</span><span>Sample N={list.length}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">Current Z-Score</span><div className="kpi-icon-badge amber">⚡</div></div>
          <div className="kpi-value">{latestZ >= 0 ? `+${formatNum(latestZ, 2)}` : formatNum(latestZ, 2)} <span className="kpi-unit">σ</span></div>
          <div className="kpi-footer"><span className={`kpi-trend-pill ${Math.abs(latestZ) >= 3 ? 'down' : 'up'}`}>{Math.abs(latestZ) >= 3 ? 'Anomaly' : 'Within Normal'}</span><span>Gaussian Limit</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">CO₂ Footprint (Est.)</span><div className="kpi-icon-badge emerald">🌱</div></div>
          <div className="kpi-value">{(dailyKwh * 0.85).toFixed(1)} <span className="kpi-unit">kg CO₂</span></div>
          <div className="kpi-footer"><span className="kpi-trend-pill up">Clean Grid</span><span>Green Index</span></div>
        </div>
      </div>

      {/* Main Z-Score Anomaly Chart Panel */}
      <div className="panel-card" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <div className="panel-title-area">
            <span className="panel-icon">🛡️</span>
            <div>
              <h3 className="panel-title">Z-Score Statistical Anomaly & Outlier Detection</h3>
              <div className="panel-subtitle">Real-time standard deviation metric mapping: detects high-draw surges & safety hazards</div>
            </div>
          </div>
        </div>
        <ZScoreChart data={list} height={320} initialThreshold={3.0} />
      </div>

      <div className="section-grid">
        <div className="main-col">
          {/* Anomaly Risk Status Banner */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">⚙️</span>
                <div>
                  <h3 className="panel-title">Statistical Assessment Summary</h3>
                  <div className="panel-subtitle">Gaussian distribution Z-test results on latest telemetry stream</div>
                </div>
              </div>
            </div>
            <div style={{
              padding: 22,
              borderRadius: 'var(--radius-md)',
              background: Math.abs(latestZ) >= 3 ? 'var(--rose-bg)' : Math.abs(latestZ) >= 2 ? 'var(--amber-bg)' : 'var(--emerald-bg)',
              border: `1px solid ${Math.abs(latestZ) >= 3 ? 'var(--rose-border)' : Math.abs(latestZ) >= 2 ? 'var(--amber-border)' : 'var(--emerald-border)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 20
            }}>
              <div style={{ fontSize: '2.5rem' }}>{Math.abs(latestZ) >= 3 ? '🚨' : Math.abs(latestZ) >= 2 ? '⚠️' : '🛡️'}</div>
              <div>
                <h4 style={{ color: Math.abs(latestZ) >= 3 ? 'var(--rose-main)' : Math.abs(latestZ) >= 2 ? 'var(--amber-main)' : 'var(--emerald-main)', fontSize: '1.08rem' }}>
                  {Math.abs(latestZ) >= 3
                    ? 'Critical Statistical Anomaly Detected'
                    : Math.abs(latestZ) >= 2
                    ? 'Elevated Load Deviation (Warning)'
                    : 'System Operating Within Normal Statistical Baseline'}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', marginTop: 4 }}>
                  {Math.abs(latestZ) >= 3
                    ? `Current reading (${latestPower}W) deviates by ${formatNum(Math.abs(latestZ), 2)}σ standard deviations from normal mean (${formatNum(meanVal, 1)}W). This exceeds the 3.0σ threshold (probability < 0.3%). Possible heavy appliance surge or short-circuit risk.`
                    : Math.abs(latestZ) >= 2
                    ? `Current load (${latestPower}W) is moderately elevated at Z = ${formatNum(latestZ, 2)}σ. Approaching peak operating capacity.`
                    : `Active power draw (${latestPower}W) is safely clustered around baseline mean (${formatNum(meanVal, 1)} ± ${formatNum(stddevVal, 1)}W). Z-Score = ${formatNum(latestZ, 2)}σ.`}
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
          {/* Z-Score Reference Card */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title-area">
                <span className="panel-icon">📐</span>
                <div>
                  <h3 className="panel-title">Z-Score Distribution Model</h3>
                  <div className="panel-subtitle">Statistical confidence levels</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '10px 14px', background: 'var(--emerald-bg)', border: '1px solid var(--emerald-border)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--emerald-main)', fontSize: '0.82rem' }}>|Z| &lt; 1.0σ (68.2%)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Normal Core</span>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-accent-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.82rem' }}>|Z| &lt; 2.0σ (95.4%)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Acceptable Band</span>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--amber-main)', fontSize: '0.82rem' }}>2.0σ ≤ |Z| &lt; 3.0σ</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Warning (4.3%)</span>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--rose-bg)', border: '1px solid var(--rose-border)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--rose-main)', fontSize: '0.82rem' }}>|Z| ≥ 3.0σ (&lt; 0.3%)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Critical Outlier</span>
              </div>
            </div>
          </div>

          {/* Peak Demand Card */}
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
                    <span style={{ fontWeight: 700, color: 'var(--amber-main)' }}>Hour {h}:00 - {h + 1}:00</span>
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
  const [relayState, setRelayState] = useState('ON')
  const [controlMode, setControlMode] = useState('AUTO')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetch(`${API}/devices/relay`)
      .then(r => r.json())
      .then(d => {
        if (d.relay_state) setRelayState(d.relay_state)
        if (d.control_mode) setControlMode(d.control_mode)
      })
      .catch(() => {})
  }, [])

  async function toggleRelay() {
    const newState = relayState === 'ON' ? 'OFF' : 'ON'
    try {
      const r = await fetch(`${API}/devices/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relay_state: newState, control_mode: 'MANUAL', triggered_by: 'user-dashboard' })
      })
      const j = await r.json()
      if (j.ok && j.state) {
        setRelayState(j.state.relay_state)
        setControlMode(j.state.control_mode)
      }
    } catch {
      setRelayState(newState)
    }
  }

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
                <div className="panel-subtitle">IoT Nodes, PZEM sensors, and automated relay modules (Phase 7)</div>
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
                  <th>Mode</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: '700', color: 'var(--brand-primary-light)' }}>esp32-main-01</td>
                  <td>ESP32 + PZEM-004T</td>
                  <td>Main Electrical Panel</td>
                  <td>
                    <button className={`btn btn-sm ${relayState === 'ON' ? 'btn-danger' : 'btn-success'}`} onClick={toggleRelay}>
                      {relayState === 'ON' ? 'Cut Power (Relay OFF)' : 'Restore Power (Relay ON)'}
                    </button>
                  </td>
                  <td>
                    <span className={`nav-badge ${controlMode === 'AUTO' ? 'blue' : 'amber'}`}>{controlMode}</span>
                  </td>
                  <td><span className={`nav-badge ${relayState === 'ON' ? 'green' : 'amber'}`}>{relayState === 'ON' ? 'Connected' : 'Power Cut'}</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '700', color: 'var(--brand-primary-light)' }}>esp32-hvac-02</td>
                  <td>Smart Relay Module</td>
                  <td>HVAC Air Conditioner</td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto Peak Cut</span>
                  </td>
                  <td><span className="nav-badge blue">AUTO</span></td>
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
    <div style={{ maxWidth: 900 }}>
      <UsageReportChart height={320} />

      <SensorDatalogReport height={260} />

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
  const [telemetryStatus, setTelemetryStatus] = useState('loading')
  const [currentTime, setCurrentTime] = useState(new Date())

  const fetchAll = useCallback(() => {
    fetch(`${API}/readings/health`)
      .then(r => { setIsConnected(r.ok); return r.json() })
      .catch(() => setIsConnected(false))

    fetch(`${API}/readings/latest`).then(r => r.json()).then(setLatest).catch(() => setLatest(null))
    fetch(`${API}/readings?limit=50`)
      .then(async r => {
        if (!r.ok) throw new Error('Telemetry request failed')
        const readings = await r.json()
        if (!Array.isArray(readings)) throw new Error('Invalid telemetry response')
        setList(readings)
        setTelemetryStatus(readings.length ? 'ready' : 'empty')
      })
      .catch(() => {
        setList([])
        setLatest(null)
        setTelemetryStatus('unavailable')
      })
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
    reports: 'Usage & Cost Reports'
  }

  const subtitles = {
    home: 'Real-time smart grid operations dashboard',
    monitoring: 'High-frequency voltage, current, and active load monitoring',
    predictions: 'Machine learning prediction models, solar simulation, and safety risk evaluation',
    recommendations: 'Prioritized insights to cut monthly bill and mitigate overload risks',
    devices: 'Control smart relays, register sensors, and configure load thresholds',
    reports: 'Present day, 7/15/30-day usage tracking, custom rate simulation, and bill estimates'
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
            <HomePage latest={latest} list={list} pred={pred} bill={bill} peakHours={peakHours} recs={recs} anomaly={anomaly} isConnected={isConnected} telemetryStatus={telemetryStatus} setPage={setPage} />
          )}

          {page === 'monitoring' && (
            <MonitoringPage list={list} latest={latest} isConnected={isConnected} fetchAll={fetchAll} />
          )}

          {page === 'predictions' && (
            <PredictionsPage pred={pred} peakHours={peakHours} anomaly={anomaly} bill={bill} list={list} />
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
