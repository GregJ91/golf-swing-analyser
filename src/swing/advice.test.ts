import { describe, it, expect } from 'vitest'
import { adviceFor } from './advice'
import type { MetricResult } from '../types'

function metric(value: number, benchmarkMin: number, benchmarkMax: number): MetricResult {
  return { value, benchmarkMin, benchmarkMax, inRange: value >= benchmarkMin && value <= benchmarkMax }
}

describe('adviceFor', () => {
  it('returns null for in-range metrics', () => {
    expect(adviceFor('tempoRatio', metric(3.0, 2.5, 3.5))).toBeNull()
  })

  it('gives direction-specific advice for tempo', () => {
    const tooQuickBack = adviceFor('tempoRatio', metric(1.8, 2.5, 3.5))
    const tooSlowBack = adviceFor('tempoRatio', metric(4.5, 2.5, 3.5))

    expect(tooQuickBack).toMatch(/rushed/i)
    expect(tooSlowBack).toMatch(/quick downswing/i)
    expect(tooQuickBack).not.toEqual(tooSlowBack)
  })

  it('gives advice for each fault metric when above range', () => {
    expect(adviceFor('hipSwayNormalized', metric(0.3, 0, 0.15))).toMatch(/wall drill/i)
    expect(adviceFor('earlyExtensionDeg', metric(9, 0, 5))).toMatch(/chair drill/i)
    expect(adviceFor('headMovementNormalized', metric(0.25, 0, 0.1))).toMatch(/head/i)
  })

  it('returns null when no advice exists for that direction', () => {
    // Hip sway below a benchmarkMin of 0 can't happen in practice, but the
    // lookup must not crash or invent advice.
    expect(adviceFor('hipSwayNormalized', metric(-0.1, 0, 0.15))).toBeNull()
  })
})
