import type Database from 'better-sqlite3'

export class ProductInventoryRepository {
  constructor(private readonly db: Database.Database) {}

  productExists(id: number) {
    const row = this.db.prepare("SELECT 1 AS ok FROM products WHERE id = ? AND is_active = 1 AND type = 'simple'").get(id) as
      | { ok: 1 }
      | undefined
    return Boolean(row?.ok)
  }

  isProgressiveProduct(productId: number) {
    const row = this.db
      .prepare(`SELECT consumption_mode FROM products WHERE id = ? AND is_active = 1`)
      .get(productId) as { consumption_mode: string } | undefined
    return row?.consumption_mode === 'progressive'
  }

  getStockByProductId(productId: number) {
    const row = this.db
      .prepare('SELECT stock FROM product_inventory_balance_view WHERE product_id = ?')
      .get(productId) as { stock: number } | undefined
    return Number(row?.stock ?? 0)
  }

  listBalance() {
    return this.db.prepare('SELECT * FROM product_inventory_balance_view WHERE product_type = ? ORDER BY product_name ASC').all('simple')
  }

  /** Productos simples con stock en o por debajo del mínimo (misma regla que el dashboard). */
  getReplenishmentList() {
    return this.db
      .prepare(
        `SELECT product_id, sku, product_name, stock, min_stock
         FROM product_inventory_balance_view
         WHERE product_type = 'simple'
           AND stock <= min_stock
         ORDER BY product_name ASC`,
      )
      .all() as Array<{
      product_id: number
      sku: string
      product_name: string
      stock: number
      min_stock: number
    }>
  }

  countBalanceRows() {
    const row = this.db
      .prepare('SELECT COUNT(*) AS c FROM product_inventory_balance_view WHERE product_type = ?')
      .get('simple') as { c: number }
    return row.c
  }

  private buildBalanceWhere(search?: string, categoryId?: number) {
    const parts = ["product_type = 'simple'"]
    const params: unknown[] = []
    if (typeof categoryId === 'number' && Number.isFinite(categoryId) && categoryId > 0) {
      parts.push('category_id = ?')
      params.push(categoryId)
    }
    const raw = search?.trim()
    if (raw) {
      parts.push('(INSTR(LOWER(product_name), LOWER(?)) > 0 OR INSTR(LOWER(sku), LOWER(?)) > 0)')
      params.push(raw, raw)
    }
    return { where: `WHERE ${parts.join(' AND ')}`, params }
  }

  /** Totales para KPIs sin cargar todas las filas. */
  balanceSummary() {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END), 0) AS low_stock
         FROM product_inventory_balance_view
         WHERE product_type = ?`,
      )
      .get('simple') as { total: number; low_stock: number }
    return {
      totalProducts: row.total,
      lowStockCount: row.low_stock,
    }
  }

  listBalancePaged(limit: number, offset: number, search?: string, categoryId?: number) {
    const { where, params } = this.buildBalanceWhere(search, categoryId)
    return this.db
      .prepare(
        `SELECT * FROM product_inventory_balance_view ${where} ORDER BY product_name ASC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset)
  }

  countBalanceRowsFiltered(search?: string, categoryId?: number) {
    const { where, params } = this.buildBalanceWhere(search, categoryId)
    const row = this.db.prepare(`SELECT COUNT(*) AS c FROM product_inventory_balance_view ${where}`).get(...params) as { c: number }
    return row.c
  }

  countMovements() {
    const row = this.db.prepare('SELECT COUNT(*) AS c FROM product_inventory_movements').get() as { c: number }
    return row.c
  }

  listMovementHistory(limit = 500) {
    const cap = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 500, 1), 2000)
    return this.db
      .prepare(
        `SELECT m.id,
                m.product_id AS product_id,
                p.sku AS sku,
                p.name AS product_name,
                m.movement_type AS movement_type,
                m.quantity AS quantity,
                m.reference_type AS reference_type,
                m.reference_id AS reference_id,
                m.note AS note,
                m.created_at AS created_at
         FROM product_inventory_movements m
         INNER JOIN products p ON p.id = m.product_id
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT ?`,
      )
      .all(cap) as Array<{
      id: number
      product_id: number
      sku: string
      product_name: string
      movement_type: 'entry' | 'exit' | 'adjustment' | 'sale'
      quantity: number
      reference_type: string
      reference_id: number | null
      note: string | null
      created_at: string
    }>
  }

  listMovementHistoryPaged(limit: number, offset: number) {
    const cap = Math.min(Math.max(Math.floor(limit), 1), 500)
    const off = Math.max(Math.floor(offset), 0)
    return this.db
      .prepare(
        `SELECT m.id,
                m.product_id AS product_id,
                p.sku AS sku,
                p.name AS product_name,
                m.movement_type AS movement_type,
                m.quantity AS quantity,
                m.reference_type AS reference_type,
                m.reference_id AS reference_id,
                m.note AS note,
                m.created_at AS created_at
         FROM product_inventory_movements m
         INNER JOIN products p ON p.id = m.product_id
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(cap, off) as Array<{
      id: number
      product_id: number
      sku: string
      product_name: string
      movement_type: 'entry' | 'exit' | 'adjustment' | 'sale'
      quantity: number
      reference_type: string
      reference_id: number | null
      note: string | null
      created_at: string
    }>
  }

  insertMovement(input: {
    productId: number
    movementType: 'entry' | 'exit' | 'adjustment' | 'sale'
    quantity: number
    referenceType: string
    referenceId?: number | null
    note?: string | null
  }) {
    this.db
      .prepare(
        `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, reference_id, note)
         VALUES (@productId, @movementType, @quantity, @referenceType, @referenceId, @note)`,
      )
      .run({
        productId: input.productId,
        movementType: input.movementType,
        quantity: input.quantity,
        referenceType: input.referenceType,
        referenceId: input.referenceId ?? null,
        note: input.note ?? null,
      })
  }
}

