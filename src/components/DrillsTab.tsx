import { DRILLS } from '../swing/drills'
import { DrillCard } from './DrillCard'

export function DrillsTab() {
  return (
    <div className="drills-tab">
      <p className="view-note">
        Every drill the analyser prescribes, ready for the range. After a session, the summary
        points you at the one that matters most for that swing.
      </p>
      {DRILLS.map((drill) => (
        <DrillCard key={drill.name} drill={drill} />
      ))}
    </div>
  )
}
