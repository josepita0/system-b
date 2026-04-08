import type Database from 'better-sqlite3'
import type { AccountOpenedInShift, CancelledEmptyAccountInShift } from '../../shared/types/report'
import type {
  CashSession,
  CashSessionHistoryEntry,
  ShiftDefinition,
  ShiftSessionSaleDetail,
  ShiftSessionTabDetail,
} from '../../shared/types/shift'

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
    openingCashNote: row.opening_cash_note ?? null,
    closingNote: row.closing_note ?? null,
    expectedCash: row.expected_cash,
    countedCash: row.counted_cash,
    differenceCash: row.difference_cash,
    status: row.status,
    pendingReconcileTotal:
      row.pending_reconcile_total != null && row.pending_reconcile_total !== ''
        ? Number(row.pending_reconcile_total)
        : null,
    openedByUserId: row.opened_by_user_id != null ? Number(row.opened_by_user_id) : null,
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

  createSession(
    shiftId: number,
    businessDate: string,
    openingCash: number,
    openedByUserId: number,
    openingCashNote: string | null,
  ) {
    const result = this.db
      .prepare(
        `INSERT INTO cash_sessions (shift_id, business_date, opening_cash, opening_cash_note, opened_by_user_id)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(shiftId, businessDate, openingCash, openingCashNote, openedByUserId)

    return this.getSessionById(Number(result.lastInsertRowid))!
  }

  closeSession(id: number, expectedCash: number, countedCash: number, pendingReconcileTotal: number, closingNote: string) {
    const differenceCash = countedCash - expectedCash
    this.db
      .prepare(
        `UPDATE cash_sessions
         SET expected_cash = ?,
             counted_cash = ?,
             difference_cash = ?,
             closed_at = CURRENT_TIMESTAMP,
             status = 'closed',
             pending_reconcile_total = ?,
             closing_note = ?
         WHERE id = ?`,
      )
      .run(expectedCash, countedCash, differenceCash, pendingReconcileTotal, closingNote, id)

    return this.getSessionById(id)!
  }

  /** Efectivo esperado: ventas al contado + cobros de pagarés en este turno (no cargos a cuenta). */
  getSalesTotalForSession(sessionId: number) {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) AS total FROM sales
         WHERE cash_session_id = ?
           AND sale_type IN ('pos', 'tab_payment')`,
      )
      .get(sessionId) as { total: number }
    return row.total
  }

  /**
   * Suma de saldos pendientes de todas las cuentas pagaré abiertas (cargos tab_charge),
   * sin importar en qué turno se abrió la cuenta ni en cuál se registró el cargo.
   * Alineado con el total de la tabla «Cuentas pendientes por liquidar» y con el snapshot al cerrar.
   */
  getTotalPendingReconcileOpenTabs() {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(si.subtotal), 0) AS total
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         INNER JOIN customer_tabs t ON t.id = s.tab_id
         WHERE s.sale_type = 'tab_charge'
           AND t.status = 'open'`,
      )
      .get() as { total: number }
    return Number(row.total)
  }

  getLatestClosedSessionId() {
    const row = this.db
      .prepare(
        `SELECT id FROM cash_sessions
         WHERE status = 'closed' AND closed_at IS NOT NULL
         ORDER BY closed_at DESC, id DESC
         LIMIT 1`,
      )
      .get() as { id: number } | undefined
    return row ? row.id : null
  }

  /** IDs de sesiones cerradas elegibles para el histórico del empleado (reglas de negocio). */
  listEmployeeEligibleSessionIds(openedByUserId: number) {
    const rows = this.db
      .prepare(
        `SELECT cs.id
         FROM cash_sessions cs
         WHERE cs.status = 'closed'
           AND cs.opened_by_user_id = ?
           AND cs.pending_reconcile_total IS NOT NULL
           AND cs.pending_reconcile_total = 0
           AND NOT EXISTS (
             SELECT 1 FROM customer_tabs ct
             WHERE ct.opened_cash_session_id = cs.id AND ct.status = 'open'
           )
         ORDER BY cs.closed_at DESC, cs.id DESC`,
      )
      .all(openedByUserId) as Array<{ id: number }>
    return rows.map((r) => r.id)
  }

  /** Comprueba si el empleado puede ver el detalle de una sesión (misma regla que lista + última cerrada global). */
  canEmployeeViewSession(userId: number, sessionId: number) {
    const latest = this.getLatestClosedSessionId()
    if (latest === sessionId) {
      return true
    }
    const row = this.db
      .prepare(
        `SELECT cs.id
         FROM cash_sessions cs
         WHERE cs.id = ?
           AND cs.status = 'closed'
           AND cs.opened_by_user_id = ?
           AND cs.pending_reconcile_total IS NOT NULL
           AND cs.pending_reconcile_total = 0
           AND NOT EXISTS (
             SELECT 1 FROM customer_tabs ct
             WHERE ct.opened_cash_session_id = cs.id AND ct.status = 'open'
           )`,
      )
      .get(sessionId, userId) as { id: number } | undefined
    return Boolean(row)
  }

  countClosedSessions() {
    const row = this.db.prepare("SELECT COUNT(*) AS c FROM cash_sessions WHERE status = 'closed'").get() as { c: number }
    return row.c
  }

  listClosedSessionsForManager(limit: number, offset: number) {
    const rows = this.db
      .prepare(
        `SELECT cs.id
         FROM cash_sessions cs
         WHERE cs.status = 'closed'
         ORDER BY cs.closed_at DESC, cs.id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as Array<{ id: number }>
    return rows.map((r) => r.id)
  }

  getHistoryEntryById(sessionId: number): CashSessionHistoryEntry | null {
    const row = this.db
      .prepare(
        `SELECT cs.*, COALESCE(s.name, 'Turno') AS shift_name,
                e.first_name AS opened_by_first_name,
                e.last_name AS opened_by_last_name
         FROM cash_sessions cs
         LEFT JOIN shifts s ON s.id = cs.shift_id
         LEFT JOIN employees e ON e.id = cs.opened_by_user_id
         WHERE cs.id = ?`,
      )
      .get(sessionId) as any
    if (!row) {
      return null
    }
    const fn = row.opened_by_first_name as string | null
    const ln = row.opened_by_last_name as string | null
    const label =
      fn || ln ? [fn, ln].filter(Boolean).join(' ').trim() || null : null
    const base: CashSessionHistoryEntry = {
      id: row.id,
      shiftId: row.shift_id,
      shiftName: row.shift_name,
      businessDate: row.business_date,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      openedByUserId: row.opened_by_user_id != null ? Number(row.opened_by_user_id) : null,
      openedByLabel: label,
      openingCash: Number(row.opening_cash),
      openingCashNote: row.opening_cash_note ?? null,
      closingNote: row.closing_note ?? null,
      expectedCash: row.expected_cash != null ? Number(row.expected_cash) : null,
      countedCash: row.counted_cash != null ? Number(row.counted_cash) : null,
      differenceCash: row.difference_cash != null ? Number(row.difference_cash) : null,
      pendingReconcileTotal:
        row.pending_reconcile_total != null && row.pending_reconcile_total !== ''
          ? Number(row.pending_reconcile_total)
          : null,
      status: row.status,
    }

    if (row.status === 'open') {
      const sid = Number(row.id)
      const cashSales = this.getSalesTotalForSession(sid)
      const pending = this.getTotalPendingReconcileOpenTabs()
      return {
        ...base,
        liveExpectedCash: Math.round((Number(row.opening_cash) + cashSales) * 100) / 100,
        livePendingReconcile: Math.round(pending * 100) / 100,
      }
    }

    return base
  }

  getHistoryEntriesByIds(ids: number[]) {
    if (ids.length === 0) {
      return [] as CashSessionHistoryEntry[]
    }
    const placeholders = ids.map(() => '?').join(', ')
    const rows = this.db
      .prepare(
        `SELECT cs.id, cs.shift_id, cs.business_date, cs.opened_at, cs.closed_at,
               cs.opening_cash, cs.opening_cash_note, cs.closing_note, cs.expected_cash, cs.counted_cash, cs.difference_cash,
                cs.status, cs.pending_reconcile_total, cs.opened_by_user_id,
                COALESCE(s.name, 'Turno') AS shift_name,
                e.first_name AS opened_by_first_name,
                e.last_name AS opened_by_last_name
         FROM cash_sessions cs
         LEFT JOIN shifts s ON s.id = cs.shift_id
         LEFT JOIN employees e ON e.id = cs.opened_by_user_id
         WHERE cs.id IN (${placeholders})`,
      )
      .all(...ids) as any[]

    const mapRow = (row: any): CashSessionHistoryEntry => {
      const fn = row.opened_by_first_name as string | null
      const ln = row.opened_by_last_name as string | null
      const label =
        fn || ln ? [fn, ln].filter(Boolean).join(' ').trim() || null : null
      return {
        id: row.id,
        shiftId: row.shift_id,
        shiftName: row.shift_name,
        businessDate: row.business_date,
        openedAt: row.opened_at,
        closedAt: row.closed_at,
        openedByUserId: row.opened_by_user_id != null ? Number(row.opened_by_user_id) : null,
        openedByLabel: label,
        openingCash: Number(row.opening_cash),
        openingCashNote: row.opening_cash_note ?? null,
        closingNote: row.closing_note ?? null,
        expectedCash: row.expected_cash != null ? Number(row.expected_cash) : null,
        countedCash: row.counted_cash != null ? Number(row.counted_cash) : null,
        differenceCash: row.difference_cash != null ? Number(row.difference_cash) : null,
        pendingReconcileTotal:
          row.pending_reconcile_total != null && row.pending_reconcile_total !== ''
            ? Number(row.pending_reconcile_total)
            : null,
        status: row.status,
      }
    }

    const byId = new Map(rows.map((r) => [r.id, mapRow(r)]))
    return ids.map((id) => byId.get(id)).filter((e): e is CashSessionHistoryEntry => Boolean(e))
  }

  getSessionSalesDetail(sessionId: number): ShiftSessionSaleDetail[] {
    const sales = this.db
      .prepare(
        `SELECT s.id, s.sale_type, s.total, s.created_at, s.tab_id,
                ct.customer_name AS tab_customer_name
         FROM sales s
         LEFT JOIN customer_tabs ct ON ct.id = s.tab_id
         WHERE s.cash_session_id = ?
         ORDER BY s.id ASC`,
      )
      .all(sessionId) as Array<{
      id: number
      sale_type: string
      total: number
      created_at: string
      tab_id: number | null
      tab_customer_name: string | null
    }>

    const lineStmt = this.db.prepare(
      `SELECT product_name, quantity, subtotal FROM sale_items WHERE sale_id = ? ORDER BY id ASC`,
    )

    return sales.map((s) => ({
      id: s.id,
      saleType: s.sale_type,
      total: Number(s.total),
      createdAt: s.created_at,
      tabId: s.tab_id != null ? Number(s.tab_id) : null,
      tabCustomerName: s.tab_customer_name?.trim() ? s.tab_customer_name.trim() : null,
      lines: (lineStmt.all(s.id) as Array<{ product_name: string; quantity: number; subtotal: number }>).map(
        (li) => ({
          productName: li.product_name,
          quantity: Number(li.quantity),
          subtotal: Number(li.subtotal),
        }),
      ),
    }))
  }

  /** Cuentas de cliente cuya apertura ocurrió en esta sesión de caja, con consumos cargados a la cuenta. */
  getAccountsOpenedInSession(sessionId: number): AccountOpenedInShift[] {
    const tabs = this.db
      .prepare(
        `SELECT id, customer_name, opened_at
         FROM customer_tabs
         WHERE opened_cash_session_id = ?
         ORDER BY id ASC`,
      )
      .all(sessionId) as Array<{
      id: number
      customer_name: string
      opened_at: string
    }>

    return this.mapTabRowsToAccountsOpened(tabs)
  }

  /**
   * Cuentas pagaré aún abiertas con saldo pendiente, sin filtrar por turno de apertura
   * (para el PDF de cierre y la misma visión que «Liquidar cuenta» en el POS).
   */
  getOpenPendingAccountsToLiquidate(): AccountOpenedInShift[] {
    const tabs = this.db
      .prepare(
        `SELECT id, customer_name, opened_at
         FROM customer_tabs
         WHERE status = 'open'
         ORDER BY opened_at ASC`,
      )
      .all() as Array<{
      id: number
      customer_name: string
      opened_at: string
    }>

    return this.mapTabRowsToAccountsOpened(tabs).filter((a) => a.balanceTotal > 0.00001)
  }

  private mapTabRowsToAccountsOpened(
    tabs: Array<{ id: number; customer_name: string; opened_at: string }>,
  ): AccountOpenedInShift[] {
    const linesStmt = this.db.prepare(
      `SELECT si.product_name AS product_name, si.quantity AS quantity, si.subtotal AS subtotal
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE s.tab_id = ? AND s.sale_type = 'tab_charge'
       ORDER BY s.id ASC, si.id ASC`,
    )

    const balanceStmt = this.db.prepare(
      `SELECT COALESCE(SUM(si.subtotal), 0) AS t
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE s.tab_id = ? AND s.sale_type = 'tab_charge'`,
    )

    return tabs.map((t) => {
      const rawLines = linesStmt.all(t.id) as Array<{
        product_name: string
        quantity: number
        subtotal: number
      }>
      const balRow = balanceStmt.get(t.id) as { t: number }
      return {
        tabId: t.id,
        customerName: t.customer_name,
        openedAt: t.opened_at,
        consumptionLines: rawLines.map((li) => ({
          productName: li.product_name,
          quantity: Number(li.quantity),
          subtotal: Number(li.subtotal),
        })),
        balanceTotal: Math.round(Number(balRow.t) * 100) / 100,
      }
    })
  }

  getSessionTabsDetail(sessionId: number): ShiftSessionTabDetail[] {
    const rows = this.db
      .prepare(
        `SELECT id, customer_name, status, opened_at, settled_at,
                opened_cash_session_id, settled_cash_session_id,
                cancelled_at, cancelled_cash_session_id, cancelled_by_employee_id, cancel_reason
         FROM customer_tabs
         WHERE opened_cash_session_id = ? OR settled_cash_session_id = ? OR cancelled_cash_session_id = ?
         ORDER BY id ASC`,
      )
      .all(sessionId, sessionId, sessionId) as Array<{
      id: number
      customer_name: string
      status: string
      opened_at: string
      settled_at: string | null
      opened_cash_session_id: number
      settled_cash_session_id: number | null
      cancelled_at: string | null
      cancelled_cash_session_id: number | null
      cancelled_by_employee_id: number | null
      cancel_reason: string | null
    }>

    return rows.map((r) => ({
      id: r.id,
      customerName: r.customer_name,
      status: r.status,
      openedAt: r.opened_at,
      settledAt: r.settled_at,
      cancelledAt: r.cancelled_at,
      cancelReason: r.cancel_reason,
      cancelledByEmployeeId: r.cancelled_by_employee_id != null ? Number(r.cancelled_by_employee_id) : null,
      openedCashSessionId: r.opened_cash_session_id,
      settledCashSessionId: r.settled_cash_session_id,
      cancelledCashSessionId: r.cancelled_cash_session_id,
      openedHere: r.opened_cash_session_id === sessionId,
      settledHere: r.settled_cash_session_id === sessionId,
      cancelledHere: r.cancelled_cash_session_id === sessionId,
    }))
  }

  getCancelledEmptyAccountsInSession(sessionId: number): CancelledEmptyAccountInShift[] {
    const rows = this.db
      .prepare(
        `SELECT ct.id AS tab_id,
                ct.customer_name AS customer_name,
                ct.cancelled_at AS cancelled_at,
                ct.cancel_reason AS cancel_reason,
                e.first_name AS first_name,
                e.last_name AS last_name,
                COALESCE((
                  SELECT SUM(s.total) FROM sales s
                  WHERE s.tab_id = ct.id AND s.sale_type = 'tab_charge'
                ), 0) AS balance
         FROM customer_tabs ct
         LEFT JOIN employees e ON e.id = ct.cancelled_by_employee_id
         WHERE ct.cancelled_cash_session_id = ?
           AND ct.status = 'cancelled'
         ORDER BY ct.cancelled_at ASC, ct.id ASC`,
      )
      .all(sessionId) as Array<{
      tab_id: number
      customer_name: string
      cancelled_at: string | null
      cancel_reason: string | null
      first_name: string | null
      last_name: string | null
      balance: number
    }>

    return rows
      .filter((r) => Math.abs(Number(r.balance)) < 0.00001)
      .map((r) => {
        const label = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Sin registro'
        return {
          tabId: r.tab_id,
          customerName: r.customer_name,
          cancelledAt: r.cancelled_at ?? '',
          cancelledByLabel: label,
          reason: (r.cancel_reason ?? '').trim(),
        }
      })
  }
}
