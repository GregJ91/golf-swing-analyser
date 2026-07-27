import { openDB, type IDBPDatabase } from 'idb'
import type { Session } from '../types'

const DB_NAME = 'golf-swing-analyser'
const STORE_NAME = 'sessions'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, session)
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, id)
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDb()
  const all = await db.getAll(STORE_NAME)
  return all.sort((a: Session, b: Session) => b.date.localeCompare(a.date))
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}

export async function clearAll(): Promise<void> {
  const db = await getDb()
  await db.clear(STORE_NAME)
}
