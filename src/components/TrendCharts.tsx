import { buildTrendSeries } from '../swing/trendSeries'
import type { TrendSeries } from '../swing/trendSeries'
import type { Session } from '../types'

const CHART_W = 300
const CHART_H = 110
const PAD = { top: 10, right: 44, bottom: 18, left: 8 }
const LINE_COLOR = '#6ba82c' // tracer green — validated in-band and >=3:1 on the dark surface
const BAND_COLOR = 'rgba(107, 168, 44, 0.18)'
const BASELINE_COLOR = '#2c3f32'
const DOT_RING_COLOR = '#16201a'

function formatValue(value: number, unit: string): string {
  const digits = Math.abs(value) < 1 ? 2 : 1
  return `${value.toFixed(digits)}${unit}`
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function MetricChart({ series }: { series: TrendSeries }) {
  const { points, benchmarkMin, benchmarkMax, label, unit } = series

  const values = points.map((p) => p.value)
  const lo = Math.min(...values, benchmarkMin)
  const hi = Math.max(...values, benchmarkMax)
  const span = hi - lo || 1
  const yLo = lo - span * 0.1
  const ySpan = span * 1.2

  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (v: number) => PAD.top + plotH - ((v - yLo) / ySpan) * plotH

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]

  return (
    <figure className="trend-chart">
      <figcaption>
        {label}
        <span className="trend-benchmark-note">
          {' '}
          (target {benchmarkMin}–{benchmarkMax}
          {unit})
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label={`${label} across sessions`}>
        {/* benchmark band */}
        <rect
          x={PAD.left}
          width={plotW}
          y={y(benchmarkMax)}
          height={Math.max(y(benchmarkMin) - y(benchmarkMax), 1)}
          fill={BAND_COLOR}
        />
        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke={BASELINE_COLOR}
          strokeWidth="1"
        />
        <path d={path} fill="none" stroke={LINE_COLOR} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.value)} r="4" fill={LINE_COLOR} stroke={DOT_RING_COLOR} strokeWidth="2">
            <title>{`${shortDate(p.date)}: ${formatValue(p.value, unit)}`}</title>
          </circle>
        ))}
        {last && (
          <text className="trend-value-label" x={x(points.length - 1) + 8} y={y(last.value) + 4}>
            {formatValue(last.value, unit)}
          </text>
        )}
        {points.length > 1 && (
          <>
            <text className="trend-axis-label" x={PAD.left} y={CHART_H - 4}>
              {shortDate(points[0].date)}
            </text>
            <text className="trend-axis-label" x={PAD.left + plotW} y={CHART_H - 4} textAnchor="end">
              {shortDate(last.date)}
            </text>
          </>
        )}
      </svg>
    </figure>
  )
}

export function TrendCharts({ sessions }: { sessions: Session[] }) {
  if (sessions.length < 2) return null
  const allSeries = buildTrendSeries(sessions)

  // A metric needs at least two sessions recorded from a view it's valid in
  // before a trend line means anything.
  const chartable = allSeries.filter((series) => series.points.length >= 2)
  if (chartable.length === 0) return null

  return (
    <section className="trend-charts">
      <h2>Trends</h2>
      {chartable.map((series) => (
        <MetricChart key={series.key} series={series} />
      ))}
    </section>
  )
}
