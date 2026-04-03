import type Database from 'better-sqlite3'

export class LicensePanelTempCodeRepository {
  constructor(private readonly db: Database.Database) {}

  insert(employeeId: number, codeHash: string, expiresAt: string) {
    this.db
      .prepare(
        `INSERT INTO license_panel_temp_codes (employee_id, code_hash, expires_at)
         VALUES (?, ?, ?)`,
      )
      .run(employeeId, codeHash, expiresAt)
  }

  /**
   * Consume la primera coincidencia no usada y vigente. Retorna true si hubo consumo.
   */
  tryConsume(employeeId: number, codeHash: string): boolean {
    const row = this.db
      .prepare(
        `SELECT id FROM license_panel_temp_codes
         WHERE employee_id = ?
           AND code_hash = ?
           AND used_at IS NULL
           AND datetime(expires_at) > datetime('now')
         ORDER BY id DESC
         LIMIT 1`,
      )
      .get(employeeId, codeHash) as { id: number } | undefined

    if (!row) {
      return false
    }

    this.db.prepare('UPDATE license_panel_temp_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id)
    return true
  }
}
