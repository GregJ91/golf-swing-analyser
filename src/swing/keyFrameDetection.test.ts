import { describe, it, expect } from 'vitest'
import { suggestKeyFrames } from './keyFrameDetection'
import type { TrajectorySample } from './keyFrameDetection'

// Builds a synthetic swing sampled every 66ms:
//   0-600ms    still at address (wrist ~(500, 600))
//   600-1400ms backswing up to (300, 200)
//   1400-1700ms fast downswing back to (500, 600) — peak speed
//   1700-2300ms decelerating follow-through up to (350, 250)
//   2300-3000ms still at finish
function syntheticSwing(): TrajectorySample[] {
  const samples: TrajectorySample[] = []
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  for (let ms = 0; ms <= 3000; ms += 66) {
    let x: number
    let y: number
    if (ms < 600) {
      x = 500
      y = 600
    } else if (ms < 1400) {
      const t = (ms - 600) / 800
      x = lerp(500, 300, t)
      y = lerp(600, 200, t)
    } else if (ms < 1700) {
      const t = (ms - 1400) / 300
      x = lerp(300, 500, t)
      y = lerp(200, 600, t)
    } else if (ms < 2300) {
      const t = (ms - 1700) / 600
      x = lerp(500, 350, t)
      y = lerp(600, 250, t)
    } else {
      x = 350
      y = 250
    }
    samples.push({ timeMs: ms, wrist: { x, y }, shoulderWidth: 100 })
  }
  return samples
}

describe('suggestKeyFrames', () => {
  it('finds all four positions in a synthetic swing', () => {
    const result = suggestKeyFrames(syntheticSwing())

    expect(result).not.toBeNull()
    expect(result!.address).toBeGreaterThanOrEqual(400)
    expect(result!.address).toBeLessThanOrEqual(750)
    expect(result!.top).toBeGreaterThanOrEqual(1250)
    expect(result!.top).toBeLessThanOrEqual(1500)
    expect(result!.impact).toBeGreaterThanOrEqual(1400)
    expect(result!.impact).toBeLessThanOrEqual(1800)
    expect(result!.finish).toBeGreaterThanOrEqual(2300)
    expect(result!.address).toBeLessThan(result!.top)
    expect(result!.top).toBeLessThan(result!.impact)
  })

  it('returns null when nothing moves fast enough to be a swing', () => {
    const still: TrajectorySample[] = Array.from({ length: 40 }, (_, i) => ({
      timeMs: i * 66,
      wrist: { x: 500 + (i % 2), y: 600 },
      shoulderWidth: 100,
    }))

    expect(suggestKeyFrames(still)).toBeNull()
  })

  it('returns null for too few samples', () => {
    expect(suggestKeyFrames(syntheticSwing().slice(0, 5))).toBeNull()
  })
})
