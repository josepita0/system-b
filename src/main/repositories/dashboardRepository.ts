import type Database from 'better-sqlite3'

export class DashboardRepository {
  constructor(private readonly db: Database.Database) {}

  listEmployees() {
    return this.db
      .prepare(
        `SELECT id, first_name AS firstName, last_name AS lastName
         FROM employees
         ORDER BY COALESCE(NULLIF(TRIM(first_name), ''), NULLIF(TRIM(last_name), ''), id) ASC`,
      )
      .all() as Array<{ id: number; firstName: string; lastName: string }>
  }

  getSalesTotals(params: { from: string; to: string; employeeId?: number }) {
    const { from, to, employeeId } = params
    return this.db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN s.sale_type IN ('pos','tab_payment') THEN s.total ELSE 0 END), 0) AS paidTotal,
           COALESCE(SUM(CASE WHEN s.sale_type = 'tab_charge' THEN s.total ELSE 0 END), 0) AS tabChargeTotal,
           COALESCE(SUM(CASE WHEN s.sale_type IN ('pos','tab_payment') THEN 1 ELSE 0 END), 0) AS paidTransactions,
           COALESCE(SUM(CASE WHEN s.sale_type = 'tab_charge' THEN 1 ELSE 0 END), 0) AS tabChargeTransactions
         FROM sales s
         INNER JOIN cash_sessions cs ON cs.id = s.cash_session_id
         WHERE cs.business_date BETWEEN ? AND ?
           AND (? IS NULL OR s.employee_id = ?)`,
      )
      .get(from, to, employeeId ?? null, employeeId ?? null) as {
      paidTotal: number
      tabChargeTotal: number
      paidTransactions: number
      tabChargeTransactions: number
    }
  }

  listDailySales(params: { from: string; to: string; employeeId?: number }) {
    const { from, to, employeeId } = params
    return this.db
      .prepare(
        `SELECT
           cs.business_date AS businessDate,
           COALESCE(SUM(CASE WHEN s.sale_type IN ('pos','tab_payment') THEN s.total ELSE 0 END), 0) AS paidTotal,
           COALESCE(SUM(CASE WHEN s.sale_type = 'tab_charge' THEN s.total ELSE 0 END), 0) AS tabChargeTotal,
           COALESCE(SUM(CASE WHEN s.sale_type IN ('pos','tab_payment') THEN 1 ELSE 0 END), 0) AS paidTransactions,
           COALESCE(SUM(CASE WHEN s.sale_type = 'tab_charge' THEN 1 ELSE 0 END), 0) AS tabChargeTransactions
         FROM cash_sessions cs
         LEFT JOIN sales s ON s.cash_session_id = cs.id
         WHERE cs.business_date BETWEEN ? AND ?
           AND (? IS NULL OR s.employee_id = ?)
         GROUP BY cs.business_date
         ORDER BY cs.business_date ASC`,
      )
      .all(from, to, employeeId ?? null, employeeId ?? null) as Array<{
      businessDate: string
      paidTotal: number
      tabChargeTotal: number
      paidTransactions: number
      tabChargeTransactions: number
    }>
  }

  listTopEmployees(params: { from: string; to: string; limit: number }) {
    const { from, to, limit } = params
    return this.db
      .prepare(
        `SELECT
           s.employee_id AS employeeId,
           e.first_name AS firstName,
           e.last_name AS lastName,
           COALESCE(SUM(CASE WHEN s.sale_type IN ('pos','tab_payment') THEN s.total ELSE 0 END), 0) AS paidTotal,
           COALESCE(SUM(CASE WHEN s.sale_type = 'tab_charge' THEN s.total ELSE 0 END), 0) AS tabChargeTotal,
           COALESCE(SUM(CASE WHEN s.sale_type IN ('pos','tab_payment') THEN 1 ELSE 0 END), 0) AS paidTransactions,
           COALESCE(SUM(CASE WHEN s.sale_type = 'tab_charge' THEN 1 ELSE 0 END), 0) AS tabChargeTransactions
         FROM sales s
         INNER JOIN cash_sessions cs ON cs.id = s.cash_session_id
         INNER JOIN employees e ON e.id = s.employee_id
         WHERE cs.business_date BETWEEN ? AND ?
           AND s.employee_id IS NOT NULL
         GROUP BY s.employee_id
         ORDER BY paidTotal DESC, paidTransactions DESC
         LIMIT ?`,
      )
      .all(from, to, limit) as Array<{
      employeeId: number
      firstName: string
      lastName: string
      paidTotal: number
      tabChargeTotal: number
      paidTransactions: number
      tabChargeTransactions: number
    }>
  }

  listTopProducts(params: { from: string; to: string; employeeId?: number; limit: number }) {
    const { from, to, employeeId, limit } = params
    return this.db
      .prepare(
        `SELECT
           si.product_id AS productId,
           si.product_name AS productName,
           COALESCE(SUM(si.quantity), 0) AS quantitySold,
           COALESCE(SUM(CASE WHEN s.sale_type IN ('pos','tab_payment') THEN si.subtotal ELSE 0 END), 0) AS revenuePaid,
           COALESCE(SUM(CASE WHEN s.sale_type = 'tab_charge' THEN si.subtotal ELSE 0 END), 0) AS revenueTabCharge
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         INNER JOIN cash_sessions cs ON cs.id = s.cash_session_id
         WHERE cs.business_date BETWEEN ? AND ?
           AND (? IS NULL OR s.employee_id = ?)
         GROUP BY si.product_id, si.product_name
         ORDER BY quantitySold DESC, revenuePaid DESC
         LIMIT ?`,
      )
      .all(from, to, employeeId ?? null, employeeId ?? null, limit) as Array<{
      productId: number
      productName: string
      quantitySold: number
      revenuePaid: number
      revenueTabCharge: number
    }>
  }
}

