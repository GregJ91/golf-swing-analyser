import { describe, it, expect } from 'vitest'
import { DRILLS, drillFor, prioritizeFaults } from './drills'
import type { MetricResult, SwingMetricsResult } from '../types'

function metric(value: number, benchmarkMin: number, benchmarkMax: number): MetricResult {
  return { value, benchmarkMin, benchmarkMax, inRange: value >= benchmarkMin && value <= benchmarkMax }
}

function makeMetrics(overrides: Partial<SwingMetricsResult> = {}): SwingMetricsResult {
  return {
    tempoRatio: metric(3, 2.5, 3.5),
    xFactorDeg: metric(40, 30, 50),
    hipSwayNormalized: metric(0.05, 0, 0.15),
    earlyExtensionDeg: metric(2, 0, 5),
    headMovementNormalized: metric(0.03, 0, 0.1),
    ...overrides,
  }
}

const ALL_KEYS: Array<keyof SwingMetricsResult> = [
  'tempoRatio',
  'xFactorDeg',
  'hipSwayNormalized',
  'earlyExtensionDeg',
  'headMovementNormalized',
]

describe('drillFor', () => {
  it('has a drill for every direction that can flag', () => {
    expect(drillFor('tempoRatio', 'below')).not.toBeNull()
    expect(drillFor('tempoRatio', 'above')).not.toBeNull()
    expect(drillFor('xFactorDeg', 'below')).not.toBeNull()
    expect(drillFor('xFactorDeg', 'above')).not.toBeNull()
    expect(drillFor('hipSwayNormalized', 'above')).not.toBeNull()
    expect(drillFor('earlyExtensionDeg', 'above')).not.toBeNull()
    expect(drillFor('headMovementNormalized', 'above')).not.toBeNull()
  })

  it('every drill has usable content', () => {
    for (const drill of DRILLS) {
      expect(drill.name.length).toBeGreaterThan(0)
      expect(drill.steps.length).toBeGreaterThanOrEqual(2)
      expect(drill.reps.length).toBeGreaterThan(0)
    }
  })
})

describe('prioritizeFaults', () => {
  it('returns empty when everything is in range', () => {
    expect(prioritizeFaults(makeMetrics(), ALL_KEYS)).toEqual([])
  })

  it('ranks the proportionally-worst fault first', () => {
    const metrics = makeMetrics({
      // 1 degree over a 5-degree zone: severity 0.2
      earlyExtensionDeg: metric(6, 0, 5),
      // 0.15 over a 0.15 zone: severity 1.0 — much worse proportionally
      hipSwayNormalized: metric(0.3, 0, 0.15),
    })

    const faults = prioritizeFaults(metrics, ALL_KEYS)

    expect(faults.map((f) => f.key)).toEqual(['hipSwayNormalized', 'earlyExtensionDeg'])
    expect(faults[0].severity).toBeCloseTo(1.0)
    expect(faults[0].direction).toBe('above')
  })

  it('only considers the keys it is given (view filtering)', () => {
    const metrics = makeMetrics({ earlyExtensionDeg: metric(9, 0, 5) })

    const faults = prioritizeFaults(metrics, ['tempoRatio', 'xFactorDeg'])

    expect(faults).toEqual([])
  })

  it('reports below-range direction', () => {
    const metrics = makeMetrics({ tempoRatio: metric(1.5, 2.5, 3.5) })

    const faults = prioritizeFaults(metrics, ALL_KEYS)

    expect(faults[0].key).toBe('tempoRatio')
    expect(faults[0].direction).toBe('below')
  })
})
