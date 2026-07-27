import type { Session } from '../types'

const BACKUP_VERSION = 1

interface BackupFile {
  app: 'golf-swing-analyser'
  version: number
  exportedAt: string
  sessions: Session[]
}

export function serializeSessions(sessions: Session[], exportedAt: string): string {
  const backup: BackupFile = {
    app: 'golf-swing-analyser',
    version: BACKUP_VERSION,
    exportedAt,
    sessions,
  }
  return JSON.stringify(backup)
}

// Parses a backup file, throwing a descriptive error for anything that isn't
// one. Validation is structural (shape of each session), not exhaustive — the
// data came from this app in the first place.
export function parseBackup(json: string): Session[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Not a valid JSON file')
  }

  const backup = parsed as Partial<BackupFile>
  if (backup?.app !== 'golf-swing-analyser' || !Array.isArray(backup.sessions)) {
    throw new Error('Not a golf-swing-analyser backup file')
  }

  for (const session of backup.sessions) {
    const s = session as Partial<Session>
    if (
      typeof s.id !== 'string' ||
      typeof s.date !== 'string' ||
      !Array.isArray(s.keyFrames) ||
      typeof s.metrics !== 'object' ||
      s.metrics === null
    ) {
      throw new Error('Backup file contains a malformed session')
    }
  }

  return backup.sessions
}
