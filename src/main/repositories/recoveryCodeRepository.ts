import type Database from 'better-sqlite3'

type RecoveryRow = {
  id: number
  employee_id: number
  code_hash: string
  code_label: string
  used_at: string | null
}

export class RecoveryCodeRepository {
  constructor(private readonly db: Database.Database) {}

  replaceForUser(userId: number, codes: Array<{ codeHash: string; label: string }>, generatedByEmployeeId: number | null) {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM password_recovery_codes WHERE employee_id = ?').run(userId)
      const statement = this.db.prepare(
        `INSERT INTO password_recovery_codes (employee_id, code_hash, code_label, generated_by_employee_id)
         VALUES (?, ?, ?, ?)`,
      )

      for (const code of codes) {
        statement.run(userId, code.codeHash, code.label, generatedByEmployeeId)
      }
    })

    transaction()
  }

  listByUser(userId: number) {
    return this.db
      .prepare('SELECT * FROM password_recovery_codes WHERE employee_id = ? ORDER BY id ASC')
      .all(userId) as RecoveryRow[]
  }

  markUsed(codeId: number) {
    this.db.prepare('UPDATE password_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(codeId)
  }
}
