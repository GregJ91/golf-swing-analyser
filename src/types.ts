export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export type PoseLandmarks = Landmark[]

export type KeyFramePosition = 'address' | 'top' | 'impact' | 'finish'

// Where the camera was relative to the golfer. Each metric is only meaningful
// from one view; sessions recorded before this field existed have it undefined
// and are treated as face-on (the app's original assumed setup).
export type SwingView = 'face-on' | 'down-the-line'

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
  // Names of angle-relevant landmarks whose detection confidence was low when
  // this frame was marked — angles derived from them may be unreliable.
  lowVisibility?: string[]
}

export interface SessionKeyFrame extends KeyFrame {
  angles: AngleResults
}

export interface Session {
  id: string
  date: string
  view?: SwingView
  keyFrames: SessionKeyFrame[]
  metrics: SwingMetricsResult
}

export const KEY_FRAME_POSITIONS: KeyFramePosition[] = ['address', 'top', 'impact', 'finish']
