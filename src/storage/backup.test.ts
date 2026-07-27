import { describe, it, expect } from 'vitest'
import { parseBackup, serializeSessions } from './backup'
import type { Session } from '../types'

function makeSession(id: string): Session {
  return {
    id,
    date: '2026-07-27T10:00:00.000Z',
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

describe('backup round trip', () => {
  it('serializes and parses back the same sessions', () => {
    const sessions = [makeSession('a'), makeSession('b')]

    const restored = parseBackup(serializeSessions(sessions, '2026-07-27T12:00:00.000Z'))

    expect(restored).toEqual(sessions)
  })
})

describe('parseBackup validation', () => {
  it('rejects non-JSON', () => {
    expect(() => parseBackup('not json {')).toThrow(/valid JSON/i)
  })

  it('rejects JSON that is not a backup file', () => {
    expect(() => parseBackup('{"foo": 1}')).toThrow(/backup file/i)
    expect(() => parseBackup('[1,2,3]')).toThrow(/backup file/i)
  })

  it('rejects a backup containing a malformed session', () => {
    const bad = JSON.stringify({
      app: 'golf-swing-analyser',
      version: 1,
      exportedAt: 'x',
      sessions: [{ id: 123 }],
    })

    expect(() => parseBackup(bad)).toThrow(/malformed session/i)
  })
})
