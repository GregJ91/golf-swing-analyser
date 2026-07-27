import { describe, it, expect } from 'vitest'
import { calculateAngles } from './AngleCalculator'
import { LANDMARK } from '../pose/landmarkIndices'
import type { PoseLandmarks } from '../types'

function makeLandmarks(overrides: Record<number, { x: number; y: number }>): PoseLandmarks {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }))
  for (const [index, point] of Object.entries(overrides)) {
    landmarks[Number(index)] = { x: point.x, y: point.y, z: 0 }
  }
  return landmarks
}

describe('calculateAngles', () => {
  it('reports zero spine tilt when shoulders are directly above hips', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.2 },
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.2 },
      [LANDMARK.LEFT_HIP]: { x: 0.4, y: 0.5 },
      [LANDMARK.RIGHT_HIP]: { x: 0.6, y: 0.5 },
    })

    const result = calculateAngles(landmarks)

    expect(result.spineTiltDeg).toBeCloseTo(0, 1)
  })

  it('reports 90 degree shoulder line angle when shoulders are stacked vertically', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.5, y: 0.1 },
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.5, y: 0.3 },
      [LANDMARK.LEFT_HIP]: { x: 0.4, y: 0.5 },
      [LANDMARK.RIGHT_HIP]: { x: 0.6, y: 0.5 },
    })

    const result = calculateAngles(landmarks)

    expect(Math.abs(result.shoulderLineAngleDeg)).toBeCloseTo(90, 1)
  })

  it('reports 180 degree knee flex for a fully straight leg', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.1 },
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.1 },
      [LANDMARK.LEFT_HIP]: { x: 0.45, y: 0.5 },
      [LANDMARK.RIGHT_HIP]: { x: 0.55, y: 0.5 },
      [LANDMARK.LEFT_KNEE]: { x: 0.45, y: 0.75 },
      [LANDMARK.LEFT_ANKLE]: { x: 0.45, y: 1.0 },
    })

    const result = calculateAngles(landmarks)

    expect(result.leftKneeFlexDeg).toBeCloseTo(180, 1)
  })

  it('reports 90 degree knee flex for a right-angle bent knee', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_HIP]: { x: 0.45, y: 0.5 },
      [LANDMARK.LEFT_KNEE]: { x: 0.45, y: 0.75 },
      [LANDMARK.LEFT_ANKLE]: { x: 0.7, y: 0.75 },
    })

    const result = calculateAngles(landmarks)

    expect(result.leftKneeFlexDeg).toBeCloseTo(90, 1)
  })

  it('reports 180 degree arm angle for a straight, horizontal arm', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.2 },
      [LANDMARK.LEFT_ELBOW]: { x: 0.2, y: 0.2 },
      [LANDMARK.LEFT_WRIST]: { x: 0.0, y: 0.2 },
    })

    const result = calculateAngles(landmarks)

    expect(result.leftArmAngleDeg).toBeCloseTo(180, 1)
  })
})
