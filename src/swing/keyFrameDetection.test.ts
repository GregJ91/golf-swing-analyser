import { describe, it, expect } from 'vitest'
import { suggestKeyFrames } from './keyFrameDetection'
import type { TrajectorySample } from './keyFrameDetection'

// Builds a synthetic swing sampled every 66ms:
//   0-600ms    still at address (wrist ~(500, 600))
//   600-1400ms backswing up to (300, 200)
//   [optional pauseAtTopMs of stillness at the top]
//   then 300ms fast downswing back to (500, 600) — peak speed
//   then 600ms decelerating follow-through up to (350, 250)
//   then still at finish until 3000ms after the pause
function syntheticSwing(pauseAtTopMs = 0): TrajectorySample[] {
  const samples: TrajectorySample[] = []
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const downswingStart = 1400 + pauseAtTopMs
  const impactAt = downswingStart + 300
  const finishAt = impactAt + 600
  for (let ms = 0; ms <= 3000 + pauseAtTopMs; ms += 66) {
    let x: number
    let y: number
    if (ms < 600) {
      x = 500
      y = 600
    } else if (ms < 1400) {
      const t = (ms - 600) / 800
      x = lerp(500, 300, t)
      y = lerp(600, 200, t)
    } else if (ms < downswingStart) {
      x = 300
      y = 200
    } else if (ms < impactAt) {
      const t = (ms - downswingStart) / 300
      x = lerp(300, 500, t)
      y = lerp(200, 600, t)
    } else if (ms < finishAt) {
      const t = (ms - impactAt) / 600
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

  it('still finds the address when the swing pauses at the top', () => {
    const result = suggestKeyFrames(syntheticSwing(300))

    expect(result).not.toBeNull()
    // Address must be back at the setup stillness, not inside the top pause.
    expect(result!.address).toBeLessThanOrEqual(750)
    expect(result!.top).toBeGreaterThanOrEqual(1300)
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
