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
      {drill.tips.length > 0 && (
        <div className="drill-tips">
          <p className="drill-tips-label">What instructors say</p>
          <ul>
            {drill.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
      {drill.sources && drill.sources.length > 0 && (
        <p className="drill-sources">
          Read more:{' '}
          {drill.sources.map((source, index) => (
            <span key={source.url}>
              {index > 0 && ' · '}
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </span>
          ))}
        </p>
      )}
    </article>
  )
}
