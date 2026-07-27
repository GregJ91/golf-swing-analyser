import { describe, it, expect } from 'vitest'
import { isMetricValidForView, validMetricsForView } from './metricValidity'

describe('validMetricsForView', () => {
  it('face-on includes rotation/lateral metrics but not early extension', () => {
    const keys = validMetricsForView('face-on')

    expect(keys).toContain('tempoRatio')
    expect(keys).toContain('xFactorDeg')
    expect(keys).toContain('hipSwayNormalized')
    expect(keys).toContain('headMovementNormalized')
    expect(keys).not.toContain('earlyExtensionDeg')
  })

  it('down-the-line includes early extension but not rotation/lateral metrics', () => {
    const keys = validMetricsForView('down-the-line')

    expect(keys).toContain('tempoRatio')
    expect(keys).toContain('earlyExtensionDeg')
    expect(keys).toContain('headMovementNormalized')
    expect(keys).not.toContain('xFactorDeg')
    expect(keys).not.toContain('hipSwayNormalized')
  })

  it('treats undefined (legacy sessions) as face-on', () => {
    expect(validMetricsForView(undefined)).toEqual(validMetricsForView('face-on'))
  })
})

describe('isMetricValidForView', () => {
  it('answers per key', () => {
    expect(isMetricValidForView('earlyExtensionDeg', 'down-the-line')).toBe(true)
    expect(isMetricValidForView('earlyExtensionDeg', 'face-on')).toBe(false)
    expect(isMetricValidForView('tempoRatio', undefined)).toBe(true)
  })
})
