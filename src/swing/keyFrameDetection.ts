import type { KeyFramePosition } from '../types'
import type { Point2D } from './geometry'

export interface TrajectorySample {
  timeMs: number
  // Midpoint of both wrists, in pixel coordinates.
  wrist: Point2D
  // Shoulder width in the same pixel scale — normalizes speed so the heuristic
  // is independent of camera distance and resolution.
  shoulderWidth: number
}

// Suggests the four key-frame times from a sampled wrist trajectory, or null
// when the samples don't look like a golf swing. Heuristic:
// - impact  = the fastest wrist movement in the whole clip
// - top     = the highest wrist position before impact (image y grows downward)
// - address = the last near-still moment before the top (end of setup)
// - finish  = the first near-still moment after impact (swing has settled)
export function suggestKeyFrames(
  samples: TrajectorySample[],
): Record<KeyFramePosition, number> | null {
  if (samples.length < 10) return null

  // Speed between consecutive samples in shoulder-widths per second, assigned
  // to the later sample.
  const speeds: number[] = [0]
  for (let i = 1; i < samples.length; i++) {
    const dtSeconds = (samples[i].timeMs - samples[i - 1].timeMs) / 1000
    if (dtSeconds <= 0) {
      speeds.push(0)
      continue
    }
    const distance = Math.hypot(
      samples[i].wrist.x - samples[i - 1].wrist.x,
      samples[i].wrist.y - samples[i - 1].wrist.y,
    )
    speeds.push(distance / (samples[i].shoulderWidth || 1) / dtSeconds)
  }

  let impactIdx = 0
  for (let i = 1; i < samples.length; i++) {
    if (speeds[i] > speeds[impactIdx]) impactIdx = i
  }
  const peakSpeed = speeds[impactIdx]
  // Wrists never moving faster than ~2 shoulder-widths/second means nobody swung.
  if (peakSpeed < 2) return null

  const stillThreshold = Math.max(0.3, peakSpeed * 0.05)

  let topIdx = -1
  for (let i = 1; i < impactIdx; i++) {
    if (topIdx === -1 || samples[i].wrist.y < samples[topIdx].wrist.y) topIdx = i
  }
  if (topIdx <= 0) return null

  let addressIdx = 0
  for (let i = topIdx; i >= 1; i--) {
    if (speeds[i] < stillThreshold) {
      addressIdx = i
      break
    }
  }

  let finishIdx = samples.length - 1
  for (let i = impactIdx + 2; i < samples.length; i++) {
    if (speeds[i] < stillThreshold) {
      finishIdx = i
      break
    }
  }

  const address = samples[addressIdx].timeMs
  const top = samples[topIdx].timeMs
  const impact = samples[impactIdx].timeMs
  // SwingMetrics requires strictly chronological address < top < impact.
  if (!(address < top && top < impact)) return null

  return { address, top, impact, finish: samples[finishIdx].timeMs }
}
