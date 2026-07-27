import type { MetricResult, Session, SwingMetricsResult } from '../types'
import { adviceFor } from '../swing/advice'
import { isMetricValidForView } from '../swing/metricValidity'
import { AnnotatedSnapshot } from './AnnotatedSnapshot'

const METRIC_ROWS: Array<{ key: keyof SwingMetricsResult; label: string; unit: string }> = [
  { key: 'tempoRatio', label: 'Tempo ratio', unit: ':1' },
  { key: 'xFactorDeg', label: 'X-Factor', unit: '°' },
  { key: 'hipSwayNormalized', label: 'Hip sway', unit: '' },
  { key: 'earlyExtensionDeg', label: 'Early extension', unit: '°' },
  { key: 'headMovementNormalized', label: 'Head movement', unit: '' },
]

const VIEW_LABELS = { 'face-on': 'Face-on', 'down-the-line': 'Down-the-line' } as const

function formatValue(value: number, unit: string): string {
  const digits = Math.abs(value) < 1 ? 2 : 1
  return `${value.toFixed(digits)}${unit}`
}

// The signature readout: the pro benchmark range drawn as a zone on a band,
// with a dot marking where this swing landed.
function MetricGauge({ label, metric, unit }: { label: string; metric: MetricResult; unit: string }) {
  const span = metric.benchmarkMax - metric.benchmarkMin || 1
  const lo = Math.min(metric.benchmarkMin - span * 0.5, metric.value)
  const hi = Math.max(metric.benchmarkMax + span * 0.5, metric.value)
  const pct = (v: number) => ((v - lo) / (hi - lo || 1)) * 100

  const status = metric.inRange ? 'in range' : metric.value < metric.benchmarkMin ? 'below range' : 'above range'

  return (
    <div className="gauge-row">
      <div className="gauge-head">
        <span className="gauge-label">{label}</span>
        <span className={metric.inRange ? 'gauge-value' : 'gauge-value out'}>
          {formatValue(metric.value, unit)}
        </span>
      </div>
      <div className="gauge-band" role="img" aria-label={`${label}: ${formatValue(metric.value, unit)}, ${status}`}>
        <div className="gauge-track" />
        <div
          className="gauge-zone"
          style={{
            left: `${pct(metric.benchmarkMin)}%`,
            width: `${pct(metric.benchmarkMax) - pct(metric.benchmarkMin)}%`,
          }}
        />
        <div
          className={metric.inRange ? 'gauge-dot' : 'gauge-dot out'}
          style={{ left: `${pct(metric.value)}%` }}
        />
      </div>
      <p className="gauge-range-text">
        target {metric.benchmarkMin}–{metric.benchmarkMax}
        {unit} · {status}
      </p>
    </div>
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
            <AnnotatedSnapshot
              snapshotImage={frame.snapshotImage}
              landmarks={frame.landmarks}
              angles={frame.angles}
              alt={`${frame.position} snapshot with spine, shoulder, and hip angle lines`}
            />
            {frame.lowVisibility && frame.lowVisibility.length > 0 && (
              <p className="warning-text">
                Partly out of frame: {frame.lowVisibility.join(', ')} — angles for this frame may be
                unreliable.
              </p>
            )}
            <ul>
              <li>
                <span>Spine tilt</span>
                <span>{frame.angles.spineTiltDeg.toFixed(1)}°</span>
              </li>
              <li>
                <span>Shoulder line</span>
                <span>{frame.angles.shoulderLineAngleDeg.toFixed(1)}°</span>
              </li>
              <li>
                <span>Hip line</span>
                <span>{frame.angles.hipLineAngleDeg.toFixed(1)}°</span>
              </li>
              <li>
                <span>Left arm</span>
                <span>{frame.angles.leftArmAngleDeg.toFixed(1)}°</span>
              </li>
              <li>
                <span>Right arm</span>
                <span>{frame.angles.rightArmAngleDeg.toFixed(1)}°</span>
              </li>
              <li>
                <span>Left knee</span>
                <span>{frame.angles.leftKneeFlexDeg.toFixed(1)}°</span>
              </li>
              <li>
                <span>Right knee</span>
                <span>{frame.angles.rightKneeFlexDeg.toFixed(1)}°</span>
              </li>
            </ul>
          </div>
        ))}
      </div>

      <h2>Metrics</h2>
      <div className="gauge-list">
        {visibleRows.map((row) => (
          <MetricGauge key={row.key} label={row.label} metric={session.metrics[row.key]} unit={row.unit} />
        ))}
      </div>

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
