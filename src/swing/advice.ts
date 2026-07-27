import type { MetricResult, SwingMetricsResult } from '../types'

// Standard instruction advice for each fault, direction-aware where the fix
// differs by which side of the benchmark you're on. Sources: common TPI-style
// coaching cues; kept short — this is a nudge, not a lesson.
const ADVICE: Record<keyof SwingMetricsResult, { below?: string; above?: string }> = {
  tempoRatio: {
    below:
      'Backswing is rushed relative to your downswing. Try counting "one-two-three" back, "one" down, or swing to a 3:1 metronome beat.',
    above:
      'Backswing is slow relative to a very quick downswing — often a sign of snatching from the top. Feel a smooth change of direction; let the downswing accelerate gradually.',
  },
  xFactorDeg: {
    below:
      'Limited shoulder-hip separation costs distance. Practice the "step drill": swing to the top while keeping hips quiet, feeling your upper back coil against a stable lower body.',
    above:
      'Very large separation can strain the back and be hard to time. Let the hips turn a little more in the backswing so the coil stays controlled.',
  },
  hipSwayNormalized: {
    above:
      'Hips are sliding away from the target instead of coiling. Try the "trail-hip wall drill": set up with your trail hip near a wall and turn without bumping it.',
  },
  earlyExtensionDeg: {
    above:
      'You\'re standing up out of your posture through impact. Try the "chair drill": keep your backside brushing a chair (or wall) from address to impact while rotating.',
  },
  headMovementNormalized: {
    above:
      'Head is drifting during the swing, which hurts strike consistency. Pick a spot on the ball and keep your eyes on it; feel like your head stays inside a small box until after impact.',
  },
}

// Returns a coaching cue for an out-of-range metric, or null when the value is
// in range (or no advice applies for that direction).
export function adviceFor(key: keyof SwingMetricsResult, metric: MetricResult): string | null {
  if (metric.inRange) return null
  const direction = metric.value < metric.benchmarkMin ? 'below' : 'above'
  return ADVICE[key][direction] ?? null
}
