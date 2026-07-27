import type { Session, SwingMetricsResult } from '../types'

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendSeries {
  key: keyof SwingMetricsResult
  label: string
  unit: string
  benchmarkMin: number
  benchmarkMax: number
  points: TrendPoint[]
}

const METRIC_DEFS: Array<{ key: keyof SwingMetricsResult; label: string; unit: string }> = [
  { key: 'tempoRatio', label: 'Tempo ratio', unit: ':1' },
  { key: 'xFactorDeg', label: 'X-Factor', unit: '°' },
  { key: 'hipSwayNormalized', label: 'Hip sway', unit: '' },
  { key: 'earlyExtensionDeg', label: 'Early extension', unit: '°' },
  { key: 'headMovementNormalized', label: 'Head movement', unit: '' },
]

// Benchmark ranges live on every stored MetricResult; read them from the first
// available session so the band always matches what that data was judged against,
// falling back to the current SwingMetrics defaults when there are no sessions yet.
const FALLBACK_BENCHMARKS: Record<keyof SwingMetricsResult, [number, number]> = {
  tempoRatio: [2.5, 3.5],
  xFactorDeg: [30, 50],
  hipSwayNormalized: [0, 0.15],
  earlyExtensionDeg: [0, 5],
  headMovementNormalized: [0, 0.1],
}

export function buildTrendSeries(sessions: Session[]): TrendSeries[] {
  const oldestFirst = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

  return METRIC_DEFS.map(({ key, label, unit }) => {
    const first = oldestFirst[0]?.metrics[key]
    const [fallbackMin, fallbackMax] = FALLBACK_BENCHMARKS[key]
    return {
      key,
      label,
      unit,
      benchmarkMin: first?.benchmarkMin ?? fallbackMin,
      benchmarkMax: first?.benchmarkMax ?? fallbackMax,
      points: oldestFirst.map((session) => ({
        date: session.date,
        value: session.metrics[key].value,
      })),
    }
  })
}
