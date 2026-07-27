import type { MetricResult, Session, SwingMetricsResult } from '../types'
import { adviceFor } from '../swing/advice'
import { isMetricValidForView } from '../swing/metricValidity'

const METRIC_ROWS: Array<{ key: keyof SwingMetricsResult; label: string; unit: string }> = [
  { key: 'tempoRatio', label: 'Tempo ratio (backswing:downswing)', unit: ':1' },
  { key: 'xFactorDeg', label: 'X-Factor', unit: '°' },
  { key: 'hipSwayNormalized', label: 'Hip sway', unit: '' },
  { key: 'earlyExtensionDeg', label: 'Early extension', unit: '°' },
  { key: 'headMovementNormalized', label: 'Head movement', unit: '' },
]

const VIEW_LABELS = { 'face-on': 'Face-on', 'down-the-line': 'Down-the-line' } as const

function MetricRow({ label, metric, unit }: { label: string; metric: MetricResult; unit: string }) {
  return (
    <tr className={metric.inRange ? 'metric-ok' : 'metric-warning'}>
      <td>{label}</td>
      <td>
        {metric.value.toFixed(1)}
        {unit}
      </td>
      <td>
        {metric.benchmarkMin}-{metric.benchmarkMax}
        {unit}
      </td>
      <td>{metric.inRange ? 'OK' : 'Check this'}</td>
    </tr>
  )
}

export function SessionSummary({ session }: { session: Session }) {
  const view = session.view ?? 'face-on'
  const visibleRows = METRIC_ROWS.filter((row) => isMetricValidForView(row.key, session.view))

  return (
    <div className="session-summary">
      <h2>Swing session — {new Date(session.date).toLocaleString()}</h2>
      <p className="view-note">
        {VIEW_LABELS[view]} view — showing the metrics that are reliable from this camera angle.
      </p>

      <div className="key-frames">
        {session.keyFrames.map((frame) => (
          <div key={frame.position} className="key-frame-card">
            <h3>{frame.position}</h3>
            <img src={frame.snapshotImage} alt={`${frame.position} snapshot`} width={180} />
            {frame.lowVisibility && frame.lowVisibility.length > 0 && (
              <p className="warning-text">
                Partly out of frame: {frame.lowVisibility.join(', ')} — angles for this frame may be
                unreliable.
              </p>
            )}
            <ul>
              <li>Spine tilt: {frame.angles.spineTiltDeg.toFixed(1)}°</li>
              <li>Shoulder line: {frame.angles.shoulderLineAngleDeg.toFixed(1)}°</li>
              <li>Hip line: {frame.angles.hipLineAngleDeg.toFixed(1)}°</li>
              <li>Left arm: {frame.angles.leftArmAngleDeg.toFixed(1)}°</li>
              <li>Right arm: {frame.angles.rightArmAngleDeg.toFixed(1)}°</li>
              <li>Left knee flex: {frame.angles.leftKneeFlexDeg.toFixed(1)}°</li>
              <li>Right knee flex: {frame.angles.rightKneeFlexDeg.toFixed(1)}°</li>
            </ul>
          </div>
        ))}
      </div>

      <table className="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Pro benchmark</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <MetricRow key={row.key} label={row.label} metric={session.metrics[row.key]} unit={row.unit} />
          ))}
        </tbody>
      </table>

      {(() => {
        const tips = visibleRows
          .map((row) => ({ label: row.label, tip: adviceFor(row.key, session.metrics[row.key]) }))
          .filter((entry): entry is { label: string; tip: string } => entry.tip !== null)
        if (tips.length === 0) return null
        return (
          <section className="advice">
            <h3>What to work on</h3>
            <ul>
              {tips.map(({ label, tip }) => (
                <li key={label}>
                  <strong>{label}:</strong> {tip}
                </li>
              ))}
            </ul>
          </section>
        )
      })()}
    </div>
  )
}
