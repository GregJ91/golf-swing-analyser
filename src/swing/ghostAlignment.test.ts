import { describe, it, expect } from 'vitest'
import { alignGhostLandmarks } from './ghostAlignment'
import { LANDMARK } from '../pose/landmarkIndices'
import { midpoint } from './geometry'
import type { PoseLandmarks } from '../types'

function makeBody(hipMidX: number, hipMidY: number, torsoLen: number, hipWidth: number): PoseLandmarks {
  const landmarks: PoseLandmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }))
  landmarks[LANDMARK.LEFT_HIP] = { x: hipMidX - hipWidth / 2, y: hipMidY, z: 0 }
  landmarks[LANDMARK.RIGHT_HIP] = { x: hipMidX + hipWidth / 2, y: hipMidY, z: 0 }
  landmarks[LANDMARK.LEFT_SHOULDER] = { x: hipMidX - hipWidth / 2, y: hipMidY - torsoLen, z: 0 }
  landmarks[LANDMARK.RIGHT_SHOULDER] = { x: hipMidX + hipWidth / 2, y: hipMidY - torsoLen, z: 0 }
  landmarks[LANDMARK.LEFT_ANKLE] = { x: hipMidX, y: hipMidY + torsoLen, z: 0 }
  return landmarks
}

describe('alignGhostLandmarks', () => {
  it('moves the ghost hip midpoint onto the host hip midpoint', () => {
    const ghost = makeBody(100, 100, 80, 40)
    const host = makeBody(500, 600, 160, 80)

    const aligned = alignGhostLandmarks(ghost, host)

    const alignedHipMid = midpoint(aligned[LANDMARK.LEFT_HIP], aligned[LANDMARK.RIGHT_HIP])
    expect(alignedHipMid.x).toBeCloseTo(500)
    expect(alignedHipMid.y).toBeCloseTo(600)
  })

  it('scales the ghost so torso lengths match', () => {
    const ghost = makeBody(100, 100, 80, 40)
    const host = makeBody(500, 600, 160, 80)

    const aligned = alignGhostLandmarks(ghost, host)

    const shoulderMid = midpoint(aligned[LANDMARK.LEFT_SHOULDER], aligned[LANDMARK.RIGHT_SHOULDER])
    const hipMid = midpoint(aligned[LANDMARK.LEFT_HIP], aligned[LANDMARK.RIGHT_HIP])
    expect(Math.hypot(shoulderMid.x - hipMid.x, shoulderMid.y - hipMid.y)).toBeCloseTo(160)
    // A point below the hips scales too: ankle was torsoLen below hip mid.
    expect(aligned[LANDMARK.LEFT_ANKLE].y).toBeCloseTo(600 + 160)
  })

  it('preserves postural differences (no rotation)', () => {
    const ghost = makeBody(100, 100, 80, 40)
    // Tilt the ghost's shoulders: raise the left one.
    ghost[LANDMARK.LEFT_SHOULDER] = { x: 80, y: 10, z: 0 }
    const host = makeBody(100, 100, 80, 40)

    const aligned = alignGhostLandmarks(ghost, host)

    // Same-size bodies at the same place: the tilted shoulder must stay tilted
    // relative to the other one (only near-identity translate/scale applied).
    expect(aligned[LANDMARK.LEFT_SHOULDER].y).toBeLessThan(aligned[LANDMARK.RIGHT_SHOULDER].y)
  })
})
