import type Database from 'better-sqlite3'

export type SaleLineInsert = {
  productId: number
  productName: string
  unitPrice: number
  discount: number
  quantity: number
  subtotal: number
  saleFormatId: number | null
  complementProductId: number | null
}

export type InventoryExitInsert = {
  ingredientId: number
  quantity: number
}

export class SaleRepository {
  constructor(private readonly db: Database.Database) {}

  createSaleWithItems(
    cashSessionId: number,
    employeeId: number,
    total: number,
    lines: SaleLineInsert[],
    inventoryExits: InventoryExitInsert[],
  ) {
    const run = this.db.transaction(() => {
      const saleResult = this.db
        .prepare(
          `INSERT INTO sales (cash_session_id, employee_id, sale_type, total)
           VALUES (?, ?, 'pos', ?)`,
        )
        .run(cashSessionId, employeeId, total)

      const saleId = Number(saleResult.lastInsertRowid)

      const insertLine = this.db.prepare(
        `INSERT INTO sale_items (
           sale_id, product_id, product_name, unit_price, discount, quantity, subtotal,
           sale_format_id, complement_product_id
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )

      for (const line of lines) {
        insertLine.run(
          saleId,
          line.productId,
          line.productName,
          line.unitPrice,
          line.discount,
          line.quantity,
          line.subtotal,
          line.saleFormatId,
          line.complementProductId,
        )
      }

      const insertMovement = this.db.prepare(
        `INSERT INTO inventory_movements (ingredient_id, movement_type, quantity, reference_type, reference_id)
         VALUES (?, 'exit', ?, 'sale', ?)`,
      )

      for (const exit of inventoryExits) {
        insertMovement.run(exit.ingredientId, exit.quantity, saleId)
      }

      const row = this.db.prepare('SELECT created_at FROM sales WHERE id = ?').get(saleId) as { created_at: string }
      return { id: saleId, total, cashSessionId, createdAt: row.created_at }
    })

    return run()
  }
}
