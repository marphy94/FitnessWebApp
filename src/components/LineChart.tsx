import { useMemo, useRef, useState } from 'react'
import { formatShortDate, formatWeight } from '../lib/util'

export interface Point {
  date: string
  value: number
}

const W = 340
const H = 200
const PAD = { top: 16, right: 16, bottom: 28, left: 40 }

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min = Math.max(0, min - 5)
    max = max + 5
  }
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(2)))
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

/** Einfache Verlaufskurve mit Fadenkreuz-Tooltip (Hover und Touch). */
export function LineChart({ points, label }: { points: Point[]; label: string }) {
  const [active, setActive] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const geo = useMemo(() => {
    const values = points.map((p) => p.value)
    const ticks = niceTicks(Math.min(...values), Math.max(...values))
    const yMin = ticks[0]
    const yMax = ticks[ticks.length - 1]
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
    const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH
    return { ticks, x, y }
  }, [points])

  const pick = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const sx = ((clientX - r.left) / r.width) * W
    let best = 0
    points.forEach((_, i) => {
      if (Math.abs(geo.x(i) - sx) < Math.abs(geo.x(best) - sx)) best = i
    })
    setActive(best)
  }

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${geo.x(i)},${geo.y(p.value)}`).join(' ')
  const labelEvery = Math.ceil(points.length / 5)
  const a = active !== null ? points[active] : null

  return (
    <figure className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        {geo.ticks.map((t) => (
          <g key={t}>
            <line className="chart__grid" x1={PAD.left} x2={W - PAD.right} y1={geo.y(t)} y2={geo.y(t)} />
            <text className="chart__tick" x={PAD.left - 6} y={geo.y(t)} textAnchor="end" dominantBaseline="middle">
              {t.toLocaleString('de-DE')}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.date} className="chart__tick" x={geo.x(i)} y={H - 8} textAnchor="middle">
              {formatShortDate(p.date)}
            </text>
          ) : null,
        )}
        {active !== null && (
          <line className="chart__crosshair" x1={geo.x(active)} x2={geo.x(active)} y1={PAD.top} y2={H - PAD.bottom} />
        )}
        <path className="chart__line" d={path} />
        {points.map((p, i) => (
          <circle
            key={p.date}
            className={i === active ? 'chart__dot is-active' : 'chart__dot'}
            cx={geo.x(i)}
            cy={geo.y(p.value)}
            r={i === active ? 6 : 4}
          />
        ))}
      </svg>
      {a && (
        <div className="chart__tooltip" style={{ left: `${(geo.x(active!) / W) * 100}%` }}>
          <span>{formatShortDate(a.date)}</span>
          <strong>{formatWeight(a.value)}</strong>
        </div>
      )}
    </figure>
  )
}
