import type Database from 'better-sqlite3'

export class InventoryRepository {
  constructor(private readonly db: Database.Database) {}

  getStockByIngredientId(ingredientId: number) {
    const row = this.db
      .prepare('SELECT stock FROM inventory_balance_view WHERE ingredient_id = ?')
      .get(ingredientId) as { stock: number } | undefined
    return row?.stock ?? 0
  }

  getInventoryBalance() {
    return this.db.prepare('SELECT * FROM inventory_balance_view ORDER BY ingredient_name ASC').all()
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
