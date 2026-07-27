import type { KeyFrame, KeyFramePosition, MetricResult, SwingMetricsResult } from '../types'
import { LANDMARK } from '../pose/landmarkIndices'
import { calculateAngles } from './AngleCalculator'
import { midpoint } from './geometry'

function findKeyFrame(keyFrames: KeyFrame[], position: KeyFramePosition): KeyFrame {
  const found = keyFrames.find((frame) => frame.position === position)
  if (!found) {
    throw new Error(`Missing required key frame: ${position}`)
  }
  return found
}

function metric(value: number, benchmarkMin: number, benchmarkMax: number): MetricResult {
  return { value, benchmarkMin, benchmarkMax, inRange: value >= benchmarkMin && value <= benchmarkMax }
}

function shoulderWidth(frame: KeyFrame): number {
  const left = frame.landmarks[LANDMARK.LEFT_SHOULDER]
  const right = frame.landmarks[LANDMARK.RIGHT_SHOULDER]
  return Math.hypot(right.x - left.x, right.y - left.y)
}

export function calculateSwingMetrics(keyFrames: KeyFrame[]): SwingMetricsResult {
  const address = findKeyFrame(keyFrames, 'address')
  const top = findKeyFrame(keyFrames, 'top')
  const impact = findKeyFrame(keyFrames, 'impact')

  // Tempo ratio: backswing duration : downswing duration. Pro benchmark ~3:1.
  const backswingMs = top.timestampMs - address.timestampMs
  const downswingMs = impact.timestampMs - top.timestampMs
  const tempoRatio = metric(backswingMs / downswingMs, 2.5, 3.5)

  // X-Factor: shoulder/hip line angle separation at the top of backswing. Pro benchmark ~30-50deg
  // (widened from the commonly cited 40-50deg to account for single-camera 2D measurement error).
  const topAngles = calculateAngles(top.landmarks)
  const xFactorDeg = metric(
    Math.abs(topAngles.shoulderLineAngleDeg - topAngles.hipLineAngleDeg),
    30,
    50,
  )

  // Hip sway: lateral hip-midpoint drift from address to top, normalized by shoulder width
  // (so it's independent of how far the camera is from the golfer). Minimal drift is the target.
  const addressHipMid = midpoint(address.landmarks[LANDMARK.LEFT_HIP], address.landmarks[LANDMARK.RIGHT_HIP])
  const topHipMid = midpoint(top.landmarks[LANDMARK.LEFT_HIP], top.landmarks[LANDMARK.RIGHT_HIP])
  const hipSwayNormalized = metric(
    Math.abs(topHipMid.x - addressHipMid.x) / shoulderWidth(address),
    0,
    0.15,
  )

  // Early extension: spine tilt should stay roughly constant from address to impact; a sharp
  // decrease (standing up) indicates the hips thrusting toward the ball.
  const addressAngles = calculateAngles(address.landmarks)
  const impactAngles = calculateAngles(impact.landmarks)
  const earlyExtensionDeg = metric(
    Math.abs(impactAngles.spineTiltDeg - addressAngles.spineTiltDeg),
    0,
    5,
  )

  // Head movement: lateral/vertical drift of the head from address to impact, normalized by
  // shoulder width. Minimal drift supports consistent contact.
  const addressNose = address.landmarks[LANDMARK.NOSE]
  const impactNose = impact.landmarks[LANDMARK.NOSE]
  const headMovementNormalized = metric(
    Math.hypot(impactNose.x - addressNose.x, impactNose.y - addressNose.y) / shoulderWidth(address),
    0,
    0.1,
  )

  return { tempoRatio, xFactorDeg, hipSwayNormalized, earlyExtensionDeg, headMovementNormalized }
}
