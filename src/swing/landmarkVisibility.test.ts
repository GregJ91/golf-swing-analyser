import { describe, it, expect } from 'vitest'
import { lowVisibilityLandmarks } from './landmarkVisibility'
import { LANDMARK } from '../pose/landmarkIndices'
import type { PoseLandmarks } from '../types'

function makeLandmarks(visibilityOverrides: Record<number, number | undefined>): PoseLandmarks {
  const landmarks: PoseLandmarks = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }))
  for (const [index, visibility] of Object.entries(visibilityOverrides)) {
    landmarks[Number(index)] = { x: 0.5, y: 0.5, z: 0, visibility }
  }
  return landmarks
}

describe('lowVisibilityLandmarks', () => {
  it('returns empty when all checked landmarks are confident', () => {
    expect(lowVisibilityLandmarks(makeLandmarks({}))).toEqual([])
  })

  it('names landmarks below the confidence threshold', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_HIP]: 0.2,
      [LANDMARK.LEFT_KNEE]: 0.4,
    })

    const low = lowVisibilityLandmarks(landmarks)

    expect(low).toContain('left hip')
    expect(low).toContain('left knee')
    expect(low).toHaveLength(2)
  })

  it('trusts landmarks that have no visibility score', () => {
    const landmarks = makeLandmarks({ [LANDMARK.NOSE]: undefined })

    expect(lowVisibilityLandmarks(landmarks)).toEqual([])
  })

  it('ignores low-confidence landmarks that angles never use', () => {
    // Index 20 (right index finger) is not part of any angle calculation.
    const landmarks = makeLandmarks({ 20: 0.1 })

    expect(lowVisibilityLandmarks(landmarks)).toEqual([])
  })
})
