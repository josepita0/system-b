import type Database from 'better-sqlite3'

export type CustomerTabRow = {
  id: number
  customerName: string
  openedAt: string
  balance: number
}

export class TabRepository {
  constructor(private readonly db: Database.Database) {}

  create(customerName: string, cashSessionId: number, employeeId: number) {
    const result = this.db
      .prepare(
        `INSERT INTO customer_tabs (customer_name, opened_cash_session_id, opened_by_employee_id)
         VALUES (?, ?, ?)`,
      )
      .run(customerName.trim(), cashSessionId, employeeId)

    return Number(result.lastInsertRowid)
  }

  getById(id: number) {
    const row = this.db
      .prepare(
        `SELECT id, customer_name AS customerName, status, opened_at AS openedAt,
                opened_cash_session_id AS openedCashSessionId,
                settled_at AS settledAt, settled_cash_session_id AS settledCashSessionId
         FROM customer_tabs WHERE id = ?`,
      )
      .get(id) as
      | {
          id: number
          customerName: string
          status: string
          openedAt: string
          openedCashSessionId: number
          settledAt: string | null
          settledCashSessionId: number | null
        }
      | undefined
    return row
  }

  listOpenWithBalances(): CustomerTabRow[] {
    return this.db
      .prepare(
        `SELECT
           t.id AS id,
           t.customer_name AS customerName,
           t.opened_at AS openedAt,
           COALESCE((
             SELECT SUM(s.total) FROM sales s
             WHERE s.tab_id = t.id AND s.sale_type = 'tab_charge'
           ), 0) AS balance
         FROM customer_tabs t
         WHERE t.status = 'open'
         ORDER BY t.opened_at ASC`,
      )
      .all() as CustomerTabRow[]
  }

  getTabChargeTotal(tabId: number) {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) AS total
         FROM sales WHERE tab_id = ? AND sale_type = 'tab_charge'`,
      )
      .get(tabId) as { total: number }
    return row.total
  }
}
