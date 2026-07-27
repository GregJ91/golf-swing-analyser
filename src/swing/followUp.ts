import type { Session, SwingMetricsResult } from '../types'
import { faultSeverity, prioritizeFaults } from './drills'
import { validMetricsForView } from './metricValidity'

export interface FollowUp {
  key: keyof SwingMetricsResult
  before: number
  after: number
  // The metric is inside the pro range now.
  resolved: boolean
  // Not resolved, but closer to the range than last time.
  improved: boolean
}

// Closes the coaching loop: the previous session's focus fault (its worst
// out-of-range metric) is re-checked against this session, so the summary can
// say whether the prescribed drill is working. Returns null when there's no
// previous session, the previous session had no faults, or the focus metric
// isn't measurable from both sessions' camera views.
export function buildFollowUp(current: Session, previous: Session | undefined): FollowUp | null {
  if (!previous) return null

  const previousFaults = prioritizeFaults(previous.metrics, validMetricsForView(previous.view))
  if (previousFaults.length === 0) return null

  const focus = previousFaults[0]
  if (!validMetricsForView(current.view).includes(focus.key)) return null

  const before = previous.metrics[focus.key]
  const after = current.metrics[focus.key]

  return {
    key: focus.key,
    before: before.value,
    after: after.value,
    resolved: after.inRange,
    improved: !after.inRange && faultSeverity(after) < faultSeverity(before),
  }
}
