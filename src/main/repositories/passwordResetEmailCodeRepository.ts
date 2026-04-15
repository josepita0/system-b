import type Database from 'better-sqlite3'

export type PasswordResetEmailCodeRow = {
  id: number
  employee_id: number
  email: string
  code_hash: string
  created_at: string
  expires_at: string
  used_at: string | null
  requested_by_employee_id: number | null
}

export class PasswordResetEmailCodeRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    employeeId: number
    email: string
    codeHash: string
    expiresAtIso: string
    requestedByEmployeeId: number | null
  }) {
    const result = this.db
      .prepare(
        `INSERT INTO password_reset_email_codes (
          employee_id, email, code_hash, expires_at, requested_by_employee_id
        ) VALUES (
          @employeeId, @email, @codeHash, @expiresAtIso, @requestedByEmployeeId
        )`,
      )
      .run(input)
    return Number(result.lastInsertRowid)
  }

  /**
   * Busca un código activo para el usuario (sin importar el hash).
   * Útil para rate limit (evitar spam).
   */
  getLatestActiveForEmployee(employeeId: number): PasswordResetEmailCodeRow | null {
    const row = this.db
      .prepare(
        `SELECT *
         FROM password_reset_email_codes
         WHERE employee_id = ?
           AND used_at IS NULL
           AND datetime(expires_at) > datetime('now')
         ORDER BY id DESC
         LIMIT 1`,
      )
      .get(employeeId) as PasswordResetEmailCodeRow | undefined
    return row ?? null
  }

  /** Cuenta códigos recientes para rate limit. */
  countRequestedSince(employeeId: number, sinceIso: string) {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM password_reset_email_codes
         WHERE employee_id = ?
           AND datetime(created_at) >= datetime(?)`,
      )
      .get(employeeId, sinceIso) as { count: number }
    return row.count
  }

  /**
   * Marca como usado si coincide hash y sigue activo.
   * Retorna true si consumió; false si no encontró/expiró/ya usado.
   */
  consumeIfValid(employeeId: number, codeHash: string) {
    const result = this.db
      .prepare(
        `UPDATE password_reset_email_codes
         SET used_at = CURRENT_TIMESTAMP
         WHERE employee_id = ?
           AND code_hash = ?
           AND used_at IS NULL
           AND datetime(expires_at) > datetime('now')`,
      )
      .run(employeeId, codeHash)
    return result.changes > 0
  }
}

