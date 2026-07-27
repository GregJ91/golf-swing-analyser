export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export type PoseLandmarks = Landmark[]

export type KeyFramePosition = 'address' | 'top' | 'impact' | 'finish'

export interface MetricResult {
  value: number
  benchmarkMin: number
  benchmarkMax: number
  inRange: boolean
}

export interface AngleResults {
  spineTiltDeg: number
  shoulderLineAngleDeg: number
  hipLineAngleDeg: number
  leftArmAngleDeg: number
  rightArmAngleDeg: number
  leftKneeFlexDeg: number
  rightKneeFlexDeg: number
}

export interface SwingMetricsResult {
  tempoRatio: MetricResult
  xFactorDeg: MetricResult
  hipSwayNormalized: MetricResult
  earlyExtensionDeg: MetricResult
  headMovementNormalized: MetricResult
}

export interface KeyFrame {
  position: KeyFramePosition
  timestampMs: number
  landmarks: PoseLandmarks
  snapshotImage: string
}

export interface SessionKeyFrame extends KeyFrame {
  angles: AngleResults
}

export interface Session {
  id: string
  date: string
  keyFrames: SessionKeyFrame[]
  metrics: SwingMetricsResult
}

export const KEY_FRAME_POSITIONS: KeyFramePosition[] = ['address', 'top', 'impact', 'finish']
