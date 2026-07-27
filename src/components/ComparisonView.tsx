import { KEY_FRAME_POSITIONS } from '../types'
import type { Session, SwingMetricsResult } from '../types'
import { validMetricsForView } from '../swing/metricValidity'
import { AnnotatedSnapshot } from './AnnotatedSnapshot'

const METRIC_LABELS: Record<keyof SwingMetricsResult, { label: string; unit: string }> = {
  tempoRatio: { label: 'Tempo ratio', unit: ':1' },
  xFactorDeg: { label: 'X-Factor', unit: '°' },
  hipSwayNormalized: { label: 'Hip sway', unit: '' },
  earlyExtensionDeg: { label: 'Early extension', unit: '°' },
  headMovementNormalized: { label: 'Head movement', unit: '' },
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ComparisonView({ sessions }: { sessions: [Session, Session] }) {
  // Older session on the left so "change" reads chronologically.
  const [older, newer] = [...sessions].sort((a, b) => a.date.localeCompare(b.date)) as [Session, Session]

  // Only metrics trustworthy in BOTH sessions' camera views can be compared.
  const olderValid = validMetricsForView(older.view)
  const comparableKeys = validMetricsForView(newer.view).filter((key) => olderValid.includes(key))

  return (
    <div className="comparison-view">
      <h2>
        Comparing {shortDate(older.date)} → {shortDate(newer.date)}
      </h2>

      {KEY_FRAME_POSITIONS.map((position) => {
        const olderFrame = older.keyFrames.find((frame) => frame.position === position)
        const newerFrame = newer.keyFrames.find((frame) => frame.position === position)
        if (!olderFrame || !newerFrame) return null
        return (
          <div key={position} className="comparison-frames">
            <h3>{position}</h3>
            <div className="comparison-pair">
              <figure>
                <img src={olderFrame.snapshotImage} alt={`${position}, ${shortDate(older.date)}`} />
                <figcaption>{shortDate(older.date)}</figcaption>
              </figure>
              <figure>
                <img src={newerFrame.snapshotImage} alt={`${position}, ${shortDate(newer.date)}`} />
                <figcaption>{shortDate(newer.date)}</figcaption>
              </figure>
            </div>
            <figure className="ghost-overlay">
              <AnnotatedSnapshot
                snapshotImage={newerFrame.snapshotImage}
                landmarks={newerFrame.landmarks}
                ghostLandmarks={olderFrame.landmarks}
                alt={`${position}: ${shortDate(newer.date)} skeleton in green with ${shortDate(older.date)} overlaid as a dashed ghost, aligned at the hips`}
              />
              <figcaption>
                Overlay — green is {shortDate(newer.date)}, dashed ghost is {shortDate(older.date)}
              </figcaption>
            </figure>
          </div>
        )
      })}

      {comparableKeys.length > 0 ? (
        <table className="metrics-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>{shortDate(older.date)}</th>
              <th>{shortDate(newer.date)}</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {comparableKeys.map((key) => {
              const { label, unit } = METRIC_LABELS[key]
              const before = older.metrics[key]
              const after = newer.metrics[key]
              const delta = after.value - before.value
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td className={before.inRange ? 'metric-ok' : 'metric-warning'}>
                    {before.value.toFixed(2)}
                    {unit}
                  </td>
                  <td className={after.inRange ? 'metric-ok' : 'metric-warning'}>
                    {after.value.toFixed(2)}
                    {unit}
                  </td>
                  <td>
                    {delta >= 0 ? '+' : ''}
                    {delta.toFixed(2)}
                    {unit}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="view-note">
          These sessions were filmed from different camera views, so their metrics can't be compared
          directly — only the key-frame images are shown.
        </p>
      )}
    </div>
  )
}
