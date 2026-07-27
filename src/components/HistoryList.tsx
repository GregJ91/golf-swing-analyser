import { deleteSession } from '../storage/SessionStore'
import type { Session } from '../types'

interface HistoryListProps {
  sessions: Session[]
  onSelect: (session: Session) => void
  onDeleted: () => void
}

export function HistoryList({ sessions, onSelect, onDeleted }: HistoryListProps) {
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
          <button onClick={() => onSelect(session)}>{new Date(session.date).toLocaleString()}</button>
          <button className="delete-button" onClick={() => handleDelete(session.id)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  )
}
