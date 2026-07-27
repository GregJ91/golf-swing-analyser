import { useEffect, useState } from 'react'
import { deleteSession, listSessions } from '../storage/SessionStore'
import type { Session } from '../types'

export function HistoryList({ onSelect }: { onSelect: (session: Session) => void }) {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    listSessions().then(setSessions)
  }, [])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    await deleteSession(id)
    setSessions(await listSessions())
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
