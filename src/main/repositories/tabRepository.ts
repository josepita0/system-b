import type Database from 'better-sqlite3'
import { ConflictError } from '../errors'
import type { TabChargeDetail, TabChargeLineDetail } from '../../shared/types/sale'

export type CustomerTabRow = {
  id: number
  customerName: string
  openedAt: string
  balance: number
}

export class TabRepository {
  constructor(private readonly db: Database.Database) {}

  create(customerName: string, cashSessionId: number, employeeId: number, vipCustomerId: number | null = null) {
    const result = this.db
      .prepare(
        `INSERT INTO customer_tabs (customer_name, opened_cash_session_id, opened_by_employee_id, vip_customer_id)
         VALUES (?, ?, ?, ?)`,
      )
      .run(customerName.trim(), cashSessionId, employeeId, vipCustomerId)

    return Number(result.lastInsertRowid)
  }

  getById(id: number) {
    const row = this.db
      .prepare(
        `SELECT id, customer_name AS customerName, status, opened_at AS openedAt,
                opened_cash_session_id AS openedCashSessionId,
                settled_at AS settledAt, settled_cash_session_id AS settledCashSessionId,
                cancelled_at AS cancelledAt, cancelled_cash_session_id AS cancelledCashSessionId,
                cancelled_by_employee_id AS cancelledByEmployeeId, cancel_reason AS cancelReason,
                vip_customer_id AS vipCustomerId
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
          cancelledAt: string | null
          cancelledCashSessionId: number | null
          cancelledByEmployeeId: number | null
          cancelReason: string | null
          vipCustomerId: number | null
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

  getTabChargeDetail(tabId: number): TabChargeDetail | null {
    const tab = this.db
      .prepare(`SELECT id, customer_name, status FROM customer_tabs WHERE id = ?`)
      .get(tabId) as { id: number; customer_name: string; status: string } | undefined

    if (!tab || tab.status !== 'open') {
      return null
    }

    const rows = this.db
      .prepare(
        `SELECT si.id AS sale_item_id, s.id AS sale_id, s.created_at AS created_at,
                si.product_name AS product_name, si.quantity AS quantity, si.subtotal AS subtotal
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         WHERE s.tab_id = ? AND s.sale_type = 'tab_charge'
         ORDER BY s.id ASC, si.id ASC`,
      )
      .all(tabId) as Array<{
      sale_item_id: number
      sale_id: number
      created_at: string
      product_name: string
      quantity: number
      subtotal: number
    }>

    const lines: TabChargeLineDetail[] = rows.map((r) => ({
      saleItemId: r.sale_item_id,
      saleId: r.sale_id,
      createdAt: r.created_at,
      productName: r.product_name,
      quantity: Number(r.quantity),
      subtotal: Number(r.subtotal),
    }))

    const balance = this.getTabChargeTotal(tabId)

    return {
      tabId: tab.id,
      customerName: tab.customer_name,
      balance: Math.round(balance * 100) / 100,
      lines,
    }
  }

  /** Cierra cuenta sin venta de cobro (saldo 0). */
  markTabSettledWithoutPayment(tabId: number, cashSessionId: number) {
    return this.db.transaction(() => {
      const upd = this.db
        .prepare(
          `UPDATE customer_tabs
           SET status = 'settled',
               settled_at = CURRENT_TIMESTAMP,
               settled_cash_session_id = ?
           WHERE id = ? AND status = 'open'`,
        )
        .run(cashSessionId, tabId)
      if (upd.changes === 0) {
        throw new ConflictError('La cuenta no pudo cerrarse (estado inesperado).')
      }
      const row = this.db.prepare('SELECT CURRENT_TIMESTAMP AS created_at').get() as { created_at: string }
      return { createdAt: row.created_at }
    })()
  }

  cancelEmptyTab(tabId: number, cashSessionId: number, employeeId: number, reason: string) {
    const note = reason.trim()
    if (!note) {
      throw new ConflictError('Indique el motivo de la cancelación.')
    }
    return this.db.transaction(() => {
      const total = this.getTabChargeTotal(tabId)
      if (Math.abs(total) > 0.00001) {
        throw new ConflictError('No se puede cancelar: la cuenta tiene artículos.')
      }
      const upd = this.db
        .prepare(
          `UPDATE customer_tabs
           SET status = 'cancelled',
               cancelled_at = CURRENT_TIMESTAMP,
               cancelled_cash_session_id = ?,
               cancelled_by_employee_id = ?,
               cancel_reason = ?
           WHERE id = ? AND status = 'open'`,
        )
        .run(cashSessionId, employeeId, note, tabId)
      if (upd.changes === 0) {
        throw new ConflictError('La cuenta no pudo cancelarse (estado inesperado).')
      }
      const row = this.getById(tabId)
      if (!row) {
        throw new ConflictError('No se pudo cargar la cuenta cancelada.')
      }
      return row
    })()
  }
}
