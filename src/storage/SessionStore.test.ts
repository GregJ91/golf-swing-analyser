import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { saveSession, listSessions, getSession, deleteSession, clearAll } from './SessionStore'
import type { Session } from '../types'

function makeSession(id: string, date: string): Session {
  return {
    id,
    date,
    keyFrames: [],
    metrics: {
      tempoRatio: { value: 3, benchmarkMin: 2.5, benchmarkMax: 3.5, inRange: true },
      xFactorDeg: { value: 40, benchmarkMin: 30, benchmarkMax: 50, inRange: true },
      hipSwayNormalized: { value: 0.05, benchmarkMin: 0, benchmarkMax: 0.15, inRange: true },
      earlyExtensionDeg: { value: 2, benchmarkMin: 0, benchmarkMax: 5, inRange: true },
      headMovementNormalized: { value: 0.03, benchmarkMin: 0, benchmarkMax: 0.1, inRange: true },
    },
  }
}

describe('SessionStore', () => {
  beforeEach(async () => {
    await clearAll()
  })

  it('saves and retrieves a session by id', async () => {
    const session = makeSession('session-1', '2026-07-24T10:00:00.000Z')
    await saveSession(session)

    const found = await getSession('session-1')

    expect(found).toEqual(session)
  })

  it('lists sessions newest-first by date', async () => {
    await saveSession(makeSession('older', '2026-07-20T10:00:00.000Z'))
    await saveSession(makeSession('newer', '2026-07-24T10:00:00.000Z'))

    const sessions = await listSessions()

    expect(sessions.map((s) => s.id)).toEqual(['newer', 'older'])
  })

  it('deletes a session', async () => {
    await saveSession(makeSession('to-delete', '2026-07-24T10:00:00.000Z'))

    await deleteSession('to-delete')
    const found = await getSession('to-delete')

    expect(found).toBeUndefined()
  })
})
