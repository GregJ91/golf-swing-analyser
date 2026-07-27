import { describe, it, expect } from 'vitest'
import { calculateSwingMetrics } from './SwingMetrics'
import { LANDMARK } from '../pose/landmarkIndices'
import type { KeyFrame, PoseLandmarks } from '../types'

function makeLandmarks(overrides: Record<number, { x: number; y: number }>): PoseLandmarks {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  for (const [index, point] of Object.entries(overrides)) {
    landmarks[Number(index)] = { x: point.x, y: point.y, z: 0 }
  }
  return landmarks
}

const baseLandmarks = {
  [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.2 },
  [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.2 },
  [LANDMARK.LEFT_HIP]: { x: 0.4, y: 0.5 },
  [LANDMARK.RIGHT_HIP]: { x: 0.6, y: 0.5 },
  [LANDMARK.NOSE]: { x: 0.5, y: 0.1 },
}

function makeKeyFrame(position: KeyFrame['position'], timestampMs: number, overrides: Record<number, { x: number; y: number }> = {}): KeyFrame {
  return {
    position,
    timestampMs,
    landmarks: makeLandmarks({ ...baseLandmarks, ...overrides }),
    snapshotImage: '',
  }
}

describe('calculateSwingMetrics', () => {
  it('computes tempo ratio from address/top/impact timestamps', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900),
      makeKeyFrame('impact', 1200),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.tempoRatio.value).toBeCloseTo(3, 1)
    expect(result.tempoRatio.inRange).toBe(true)
  })

  it('flags an out-of-range tempo ratio', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900),
      makeKeyFrame('impact', 1700),
      makeKeyFrame('finish', 2000),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.tempoRatio.inRange).toBe(false)
  })

  it('computes X-Factor as the shoulder/hip line angle separation at top', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900, {
        [LANDMARK.LEFT_SHOULDER]: { x: 0.35, y: 0.25 },
        [LANDMARK.RIGHT_SHOULDER]: { x: 0.65, y: 0.15 },
        [LANDMARK.LEFT_HIP]: { x: 0.42, y: 0.51 },
        [LANDMARK.RIGHT_HIP]: { x: 0.58, y: 0.49 },
      }),
      makeKeyFrame('impact', 1200),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.xFactorDeg.value).toBeGreaterThan(0)
  })

  it('reports zero hip sway and head movement when landmarks do not move', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900),
      makeKeyFrame('impact', 1200),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.hipSwayNormalized.value).toBeCloseTo(0, 2)
    expect(result.hipSwayNormalized.inRange).toBe(true)
    expect(result.headMovementNormalized.value).toBeCloseTo(0, 2)
    expect(result.headMovementNormalized.inRange).toBe(true)
  })

  it('flags hip sway when the hip midpoint drifts laterally from address to top', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900, {
        [LANDMARK.LEFT_HIP]: { x: 0.7, y: 0.5 },
        [LANDMARK.RIGHT_HIP]: { x: 0.9, y: 0.5 },
      }),
      makeKeyFrame('impact', 1200),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.hipSwayNormalized.inRange).toBe(false)
  })

  it('flags early extension when spine tilt decreases sharply from address to impact', () => {
    const keyFrames = [
      makeKeyFrame('address', 0, {
        [LANDMARK.LEFT_SHOULDER]: { x: 0.35, y: 0.2 },
        [LANDMARK.RIGHT_SHOULDER]: { x: 0.55, y: 0.2 },
      }),
      makeKeyFrame('top', 900),
      makeKeyFrame('impact', 1200, {
        [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.2 },
        [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.2 },
      }),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.earlyExtensionDeg.inRange).toBe(false)
  })

  it('throws if a required key frame position is missing', () => {
    const keyFrames = [makeKeyFrame('address', 0), makeKeyFrame('top', 900)]

    expect(() => calculateSwingMetrics(keyFrames)).toThrow()
  })
})
