import type { SwingMetricsResult, SwingView } from '../types'

// Each metric is only trustworthy from the camera view that actually shows the
// movement it measures:
// - Tempo is pure timing — valid from anywhere.
// - X-Factor (shoulder/hip line separation) and hip sway (lateral drift) need the
//   face-on view; down-the-line, those lines collapse toward the camera axis.
// - Early extension (loss of forward spine bend toward the ball) is only visible
//   down-the-line; face-on, our spine-tilt proxy measures side bend instead.
// - Head drift is meaningful in both views.
// Sessions saved before views existed have view undefined and are treated as
// face-on, the setup the app originally assumed.
export function validMetricsForView(view: SwingView | undefined): Array<keyof SwingMetricsResult> {
  if ((view ?? 'face-on') === 'down-the-line') {
    return ['tempoRatio', 'earlyExtensionDeg', 'headMovementNormalized']
  }
  return ['tempoRatio', 'xFactorDeg', 'hipSwayNormalized', 'headMovementNormalized']
}

export function isMetricValidForView(
  key: keyof SwingMetricsResult,
  view: SwingView | undefined,
): boolean {
  return validMetricsForView(view).includes(key)
}
