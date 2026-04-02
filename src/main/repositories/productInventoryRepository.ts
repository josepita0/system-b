import type Database from 'better-sqlite3'

export class ProductInventoryRepository {
  constructor(private readonly db: Database.Database) {}

  productExists(id: number) {
    const row = this.db.prepare("SELECT 1 AS ok FROM products WHERE id = ? AND is_active = 1 AND type = 'simple'").get(id) as
      | { ok: 1 }
      | undefined
    return Boolean(row?.ok)
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

