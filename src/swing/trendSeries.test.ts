import { describe, it, expect } from 'vitest'
import { buildTrendSeries } from './trendSeries'
import type { Session } from '../types'

function makeSession(id: string, date: string, tempoValue: number): Session {
  return {
    id,
    date,
    keyFrames: [],
    metrics: {
      tempoRatio: { value: tempoValue, benchmarkMin: 2.5, benchmarkMax: 3.5, inRange: true },
      xFactorDeg: { value: 40, benchmarkMin: 30, benchmarkMax: 50, inRange: true },
      hipSwayNormalized: { value: 0.05, benchmarkMin: 0, benchmarkMax: 0.15, inRange: true },
      earlyExtensionDeg: { value: 2, benchmarkMin: 0, benchmarkMax: 5, inRange: true },
      headMovementNormalized: { value: 0.03, benchmarkMin: 0, benchmarkMax: 0.1, inRange: true },
    },
  }
}

describe('buildTrendSeries', () => {
  it('produces one series per metric with points in oldest-first order', () => {
    const sessions = [
      makeSession('newer', '2026-07-27T10:00:00.000Z', 3.2),
      makeSession('older', '2026-07-20T10:00:00.000Z', 2.8),
    ]

    const series = buildTrendSeries(sessions)

    expect(series).toHaveLength(5)
    const tempo = series.find((s) => s.key === 'tempoRatio')!
    expect(tempo.points.map((p) => p.value)).toEqual([2.8, 3.2])
    expect(tempo.points[0].date < tempo.points[1].date).toBe(true)
    expect(tempo.benchmarkMin).toBe(2.5)
    expect(tempo.benchmarkMax).toBe(3.5)
    expect(tempo.label).toBeTruthy()
  })

  it('returns empty point lists for no sessions', () => {
    const series = buildTrendSeries([])

    expect(series).toHaveLength(5)
    expect(series.every((s) => s.points.length === 0)).toBe(true)
  })
})
