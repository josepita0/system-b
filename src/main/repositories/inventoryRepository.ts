import type Database from 'better-sqlite3'

export class InventoryRepository {
  constructor(private readonly db: Database.Database) {}

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
