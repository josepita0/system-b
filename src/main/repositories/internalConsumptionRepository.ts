import type Database from 'better-sqlite3'

export class InternalConsumptionRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    cashSessionId: number | null
    createdByEmployeeId: number
    reason: string
    items: Array<{ productId: number; quantity: number; note: string | null }>
  }) {
    const run = this.db.transaction(() => {
      const r = this.db
        .prepare(
          `INSERT INTO internal_consumptions (cash_session_id, created_by_employee_id, reason)
           VALUES (?, ?, ?)`,
        )
        .run(input.cashSessionId, input.createdByEmployeeId, input.reason)

      const id = Number(r.lastInsertRowid)

      const insertItem = this.db.prepare(
        `INSERT INTO internal_consumption_items (internal_consumption_id, product_id, quantity, note)
         VALUES (?, ?, ?, ?)`,
      )
      for (const it of input.items) {
        insertItem.run(id, it.productId, it.quantity, it.note)
      }

      return id
    })

    return run()
  }

  getById(id: number) {
    const header = this.db
      .prepare(
        `SELECT id, cash_session_id, created_by_employee_id, reason, status,
                cancelled_at, cancelled_by_employee_id, cancel_reason, created_at
         FROM internal_consumptions
         WHERE id = ?`,
      )
      .get(id) as
      | {
          id: number
          cash_session_id: number | null
          created_by_employee_id: number | null
          reason: string
          status: 'active' | 'cancelled'
          cancelled_at: string | null
          cancelled_by_employee_id: number | null
          cancel_reason: string | null
          created_at: string
        }
      | undefined

    if (!header) {
      return null
    }

    const items = this.db
      .prepare(
        `SELECT i.id AS id,
                i.product_id AS product_id,
                p.name AS product_name,
                p.sku AS sku,
                i.quantity AS quantity,
                i.note AS note
         FROM internal_consumption_items i
         INNER JOIN products p ON p.id = i.product_id
         WHERE i.internal_consumption_id = ?
         ORDER BY i.id ASC`,
      )
      .all(id) as Array<{
      id: number
      product_id: number
      product_name: string
      sku: string
      quantity: number
      note: string | null
    }>

    return { header, items }
  }

  countAll() {
    const row = this.db.prepare('SELECT COUNT(*) AS c FROM internal_consumptions').get() as { c: number }
    return row.c
  }

  listPaged(limit: number, offset: number) {
    return this.db
      .prepare(
        `SELECT id, cash_session_id, created_by_employee_id, reason, status,
                cancelled_at, cancelled_by_employee_id, cancel_reason, created_at
         FROM internal_consumptions
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as Array<{
      id: number
      cash_session_id: number | null
      created_by_employee_id: number | null
      reason: string
      status: 'active' | 'cancelled'
      cancelled_at: string | null
      cancelled_by_employee_id: number | null
      cancel_reason: string | null
      created_at: string
    }>
  }

  cancel(input: { id: number; cancelledByEmployeeId: number; reason: string }) {
    const r = this.db
      .prepare(
        `UPDATE internal_consumptions
         SET status = 'cancelled',
             cancelled_at = CURRENT_TIMESTAMP,
             cancelled_by_employee_id = ?,
             cancel_reason = ?
         WHERE id = ? AND status = 'active'`,
      )
      .run(input.cancelledByEmployeeId, input.reason, input.id)

    return r.changes
  }
}

