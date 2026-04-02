import type Database from 'better-sqlite3'

export class InventoryRepository {
  constructor(private readonly db: Database.Database) {}

  ingredientExists(id: number) {
    const row = this.db.prepare('SELECT 1 AS ok FROM ingredients WHERE id = ? AND is_active = 1').get(id) as { ok: 1 } | undefined
    return Boolean(row?.ok)
  }

  getStockByIngredientId(ingredientId: number) {
    const row = this.db
      .prepare('SELECT stock FROM inventory_balance_view WHERE ingredient_id = ?')
      .get(ingredientId) as { stock: number } | undefined
    return row?.stock ?? 0
  }

  getInventoryBalance() {
    return this.db.prepare('SELECT * FROM inventory_balance_view ORDER BY ingredient_name ASC').all()
  }

  insertMovement(input: {
    ingredientId: number
    movementType: 'entry' | 'exit' | 'adjustment' | 'recipe_discount'
    quantity: number
    referenceType: string
    referenceId?: number | null
    note?: string | null
  }) {
    this.db
      .prepare(
        `INSERT INTO inventory_movements (ingredient_id, movement_type, quantity, reference_type, reference_id, note)
         VALUES (@ingredientId, @movementType, @quantity, @referenceType, @referenceId, @note)`,
      )
      .run({
        ingredientId: input.ingredientId,
        movementType: input.movementType,
        quantity: input.quantity,
        referenceType: input.referenceType,
        referenceId: input.referenceId ?? null,
        note: input.note ?? null,
      })
  }

  getReplenishmentList() {
    return this.db
      .prepare(
        `SELECT *
         FROM inventory_balance_view
         WHERE stock <= min_stock
         ORDER BY ingredient_name ASC`,
      )
      .all()
  }
}
