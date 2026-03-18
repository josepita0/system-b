import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

function getElectronApp() {
  try {
    const electron = require('electron') as { app?: { isReady: () => boolean; getPath: (name: string) => string } }
    return electron.app
  } catch {
    return undefined
  }
}

let dbInstance: Database.Database | null = null

export function getDataDirectory() {
  if (process.env.SYSTEM_BARRA_DATA_DIR) {
    return process.env.SYSTEM_BARRA_DATA_DIR
  }

  const electronApp = getElectronApp()
  if (electronApp?.isReady()) {
    return path.join(electronApp.getPath('userData'), 'data')
  }

  return path.join(process.cwd(), '.data')
}

export function getDatabasePath() {
  const directory = getDataDirectory()
  fs.mkdirSync(directory, { recursive: true })
  return path.join(directory, 'system-barra.sqlite')
}

export function createDatabase(databasePath = getDatabasePath()) {
  const db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDatabase()
  }

  return dbInstance
}

export function setDbForTests(db: Database.Database | null) {
  dbInstance = db
}
