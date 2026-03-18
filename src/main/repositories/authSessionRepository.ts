import type Database from 'better-sqlite3'

type SessionRow = {
  id: number
  employee_id: number
  token_hash: string
  expires_at: string
  revoked_at: string | null
}

export class AuthSessionRepository {
  constructor(private readonly db: Database.Database) {}

  create(employeeId: number, tokenHash: string, expiresAt: string) {
    const result = this.db
      .prepare('INSERT INTO auth_sessions (employee_id, token_hash, expires_at) VALUES (?, ?, ?)')
      .run(employeeId, tokenHash, expiresAt)

    return this.getById(Number(result.lastInsertRowid))
  }

  getById(id: number) {
    return this.db.prepare('SELECT * FROM auth_sessions WHERE id = ?').get(id) as SessionRow | undefined
  }

  getActiveByTokenHash(tokenHash: string) {
    return this.db
      .prepare(
        `SELECT *
         FROM auth_sessions
         WHERE token_hash = ?
           AND revoked_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP`,
      )
      .get(tokenHash) as SessionRow | undefined
  }

  touch(sessionId: number) {
    this.db.prepare('UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId)
  }

  revoke(sessionId: number) {
    this.db.prepare('UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId)
  }
}
