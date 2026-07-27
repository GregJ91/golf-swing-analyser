import { deleteSession } from '../storage/SessionStore'
import type { Session } from '../types'

interface HistoryListProps {
  sessions: Session[]
  onSelect: (session: Session) => void
  onDeleted: () => void
  compareIds: string[]
  onToggleCompare: (id: string) => void
}

export function HistoryList({ sessions, onSelect, onDeleted, compareIds, onToggleCompare }: HistoryListProps) {
  async function handleDelete(id: string) {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    await deleteSession(id)
    onDeleted()
  }

  if (sessions.length === 0) {
    return <p>No saved sessions yet.</p>
  }

  return (
    <ul className="history-list">
      {sessions.map((session) => (
        <li key={session.id}>
          <label className="compare-checkbox">
            <input
              type="checkbox"
              checked={compareIds.includes(session.id)}
              disabled={!compareIds.includes(session.id) && compareIds.length >= 2}
              onChange={() => onToggleCompare(session.id)}
            />
            Compare
          </label>
          <button onClick={() => onSelect(session)}>{new Date(session.date).toLocaleString()}</button>
          <button className="delete-button" onClick={() => handleDelete(session.id)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  )
}
