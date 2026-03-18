import type Database from 'better-sqlite3'
import type { CashSession, ShiftDefinition } from '../../shared/types/shift'

function mapShift(row: any): ShiftDefinition {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    startTime: row.start_time,
    endTime: row.end_time,
    crossesMidnight: row.crosses_midnight,
  }
}

function mapSession(row: any): CashSession {
  return {
    id: row.id,
    shiftId: row.shift_id,
    businessDate: row.business_date,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openingCash: row.opening_cash,
    expectedCash: row.expected_cash,
    countedCash: row.counted_cash,
    differenceCash: row.difference_cash,
    status: row.status,
  }
}

export class ShiftRepository {
  constructor(private readonly db: Database.Database) {}

  listDefinitions() {
    return this.db.prepare('SELECT * FROM shifts ORDER BY id ASC').all().map(mapShift)
  }

  getCurrentSession() {
    const row = this.db.prepare("SELECT * FROM cash_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1").get()
    return row ? mapSession(row) : null
  }

  getSessionById(id: number) {
    const row = this.db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(id)
    return row ? mapSession(row) : null
  }

  createSession(shiftId: number, businessDate: string, openingCash: number) {
    const result = this.db
      .prepare(
        `INSERT INTO cash_sessions (shift_id, business_date, opening_cash)
         VALUES (?, ?, ?)`,
      )
      .run(shiftId, businessDate, openingCash)

    return this.getSessionById(Number(result.lastInsertRowid))!
  }

  closeSession(id: number, expectedCash: number, countedCash: number) {
    const differenceCash = countedCash - expectedCash
    this.db
      .prepare(
        `UPDATE cash_sessions
         SET expected_cash = ?,
             counted_cash = ?,
             difference_cash = ?,
             closed_at = CURRENT_TIMESTAMP,
             status = 'closed'
         WHERE id = ?`,
      )
      .run(expectedCash, countedCash, differenceCash, id)

    return this.getSessionById(id)!
  }

  getSalesTotalForSession(sessionId: number) {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE cash_session_id = ?')
      .get(sessionId) as { total: number }
    return row.total
  }
}
