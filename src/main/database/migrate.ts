import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'

export function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

function checksumOf(content: string) {
  let hash = 0
  for (let index = 0; index < content.length; index += 1) {
    hash = (hash << 5) - hash + content.charCodeAt(index)
    hash |= 0
  }
  return String(hash)
}

function resolveMigrationsDir(explicitDir?: string) {
  const candidates = [
    explicitDir,
    path.join(__dirname, 'migrations'),
    path.join(process.cwd(), 'src', 'main', 'database', 'migrations'),
  ].filter(Boolean) as string[]

  const match = candidates.find((candidate) => fs.existsSync(candidate))
  if (!match) {
    throw new Error('No se encontro el directorio de migraciones.')
  }

  return match
}

export function runMigrations(db: Database.Database, migrationsDir?: string) {
  ensureMigrationsTable(db)
  const resolvedMigrationsDir = resolveMigrationsDir(migrationsDir)

  const files = fs
    .readdirSync(resolvedMigrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  const applied = new Set<string>(
    db
      .prepare('SELECT filename FROM schema_migrations')
      .all()
      .map((row: unknown) => (row as { filename: string }).filename),
  )

  const applyMigration = db.transaction((filename: string, sql: string, checksum: string) => {
    db.exec(sql)
    db.prepare('INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)').run(filename, checksum)
  })

  for (const file of files) {
    if (applied.has(file)) {
      continue
    }

    const fullPath = path.join(resolvedMigrationsDir, file)
    const sql = fs.readFileSync(fullPath, 'utf8')
    applyMigration(file, sql, checksumOf(sql))
  }
}
