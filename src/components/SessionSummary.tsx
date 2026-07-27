import type { MetricResult, Session } from '../types'

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
  return (
    <div className="session-summary">
      <h2>Swing session — {new Date(session.date).toLocaleString()}</h2>

      <div className="key-frames">
        {session.keyFrames.map((frame) => (
          <div key={frame.position} className="key-frame-card">
            <h3>{frame.position}</h3>
            <img src={frame.snapshotImage} alt={`${frame.position} snapshot`} width={180} />
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
          <MetricRow label="Tempo ratio (backswing:downswing)" metric={session.metrics.tempoRatio} unit=":1" />
          <MetricRow label="X-Factor" metric={session.metrics.xFactorDeg} unit="°" />
          <MetricRow label="Hip sway" metric={session.metrics.hipSwayNormalized} unit="" />
          <MetricRow label="Early extension" metric={session.metrics.earlyExtensionDeg} unit="°" />
          <MetricRow label="Head movement" metric={session.metrics.headMovementNormalized} unit="" />
        </tbody>
      </table>
    </div>
  )
}
