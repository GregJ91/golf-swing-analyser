import { describe, it, expect } from 'vitest'
import { buildFollowUp } from './followUp'
import type { MetricResult, Session, SwingMetricsResult } from '../types'

function metric(value: number, benchmarkMin: number, benchmarkMax: number): MetricResult {
  return { value, benchmarkMin, benchmarkMax, inRange: value >= benchmarkMin && value <= benchmarkMax }
}

function makeSession(id: string, overrides: Partial<SwingMetricsResult> = {}, view?: Session['view']): Session {
  return {
    id,
    date: `2026-07-${id}T10:00:00.000Z`,
    view,
    keyFrames: [],
    metrics: {
      tempoRatio: metric(3, 2.5, 3.5),
      xFactorDeg: metric(40, 30, 50),
      hipSwayNormalized: metric(0.05, 0, 0.15),
      earlyExtensionDeg: metric(2, 0, 5),
      headMovementNormalized: metric(0.03, 0, 0.1),
      ...overrides,
    },
  }
}

describe('buildFollowUp', () => {
  it('returns null without a previous session', () => {
    expect(buildFollowUp(makeSession('27'), undefined)).toBeNull()
  })

  it('returns null when the previous session had no faults', () => {
    expect(buildFollowUp(makeSession('27'), makeSession('20'))).toBeNull()
  })

  it('reports resolved when the previous focus metric is now in range', () => {
    const previous = makeSession('20', { hipSwayNormalized: metric(0.3, 0, 0.15) })
    const current = makeSession('27', { hipSwayNormalized: metric(0.1, 0, 0.15) })

    const followUp = buildFollowUp(current, previous)

    expect(followUp).toEqual({
      key: 'hipSwayNormalized',
      before: 0.3,
      after: 0.1,
      resolved: true,
      improved: false,
    })
  })

  it('reports improvement when closer to range but still outside', () => {
    const previous = makeSession('20', { headMovementNormalized: metric(0.3, 0, 0.1) })
    const current = makeSession('27', { headMovementNormalized: metric(0.2, 0, 0.1) })

    const followUp = buildFollowUp(current, previous)!

    expect(followUp.key).toBe('headMovementNormalized')
    expect(followUp.resolved).toBe(false)
    expect(followUp.improved).toBe(true)
  })

  it('reports no improvement when worse', () => {
    const previous = makeSession('20', { headMovementNormalized: metric(0.2, 0, 0.1) })
    const current = makeSession('27', { headMovementNormalized: metric(0.3, 0, 0.1) })

    const followUp = buildFollowUp(current, previous)!

    expect(followUp.resolved).toBe(false)
    expect(followUp.improved).toBe(false)
  })

  it('follows the previous session WORST fault, not just any fault', () => {
    const previous = makeSession('20', {
      earlyExtensionDeg: metric(6, 0, 5), // severity 0.2
      hipSwayNormalized: metric(0.3, 0, 0.15), // severity 1.0 — the focus
    })
    const current = makeSession('27', { hipSwayNormalized: metric(0.2, 0, 0.15) })

    expect(buildFollowUp(current, previous)!.key).toBe('hipSwayNormalized')
  })

  it('returns null when the focus metric is not valid from both camera views', () => {
    // Early extension is only valid down-the-line; current session is face-on.
    const previous = makeSession('20', { earlyExtensionDeg: metric(10, 0, 5) }, 'down-the-line')
    const current = makeSession('27', {}, 'face-on')

    expect(buildFollowUp(current, previous)).toBeNull()
  })
})
