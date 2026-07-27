import type { Drill } from '../swing/drills'
import type { SwingMetricsResult } from '../types'

const METRIC_LABELS: Record<keyof SwingMetricsResult, string> = {
  tempoRatio: 'Tempo',
  xFactorDeg: 'X-Factor',
  hipSwayNormalized: 'Hip sway',
  earlyExtensionDeg: 'Early extension',
  headMovementNormalized: 'Head movement',
}

export function DrillCard({ drill, focus }: { drill: Drill; focus?: boolean }) {
  return (
    <article className={focus ? 'drill-card focus' : 'drill-card'}>
      <p className="drill-eyebrow">{focus ? 'Focus on this first' : METRIC_LABELS[drill.metric]}</p>
      <h3>{drill.name}</h3>
      <p className="drill-fixes">{drill.fixes}</p>
      <ol>
        {drill.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="drill-reps">{drill.reps}</p>
    </article>
  )
}
