import type Database from 'better-sqlite3'
import { ConflictError } from '../errors'
import { ProductLotRepository } from './productLotRepository'

export type SaleLineInsert = {
  productId: number
  productName: string
  unitPrice: number
  realUnitPrice?: number
  chargedUnitPrice?: number
  discount: number
  quantity: number
  subtotal: number
  saleFormatId: number | null
  complementProductId: number | null
}

export type InventoryExitInsert = {
  productId: number
  quantity: number
}

export class SaleRepository {
  constructor(private readonly db: Database.Database) {}

  createSaleWithItems(
    cashSessionId: number,
    employeeId: number,
    chargedTotal: number,
    realTotal: number,
    lines: SaleLineInsert[],
    inventoryExits: InventoryExitInsert[],
    saleType: 'pos' | 'tab_charge' = 'pos',
    tabId: number | null = null,
    vipCustomerId: number | null = null,
    vipConditionSnapshot: string | null = null,
    progressiveConsumptions: Array<{ productId: number; amount: number }> = [],
  ) {
    const run = this.db.transaction(() => {
      const saleResult = this.db
        .prepare(
          `INSERT INTO sales (cash_session_id, employee_id, sale_type, total, tab_id, vip_customer_id, real_total, charged_total, vip_condition_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(cashSessionId, employeeId, saleType, chargedTotal, tabId, vipCustomerId, realTotal, chargedTotal, vipConditionSnapshot)

      const saleId = Number(saleResult.lastInsertRowid)

      const insertLine = this.db.prepare(
        `INSERT INTO sale_items (
           sale_id, product_id, product_name,
           unit_price, discount, quantity, subtotal,
           sale_format_id, complement_product_id,
           real_unit_price, charged_unit_price
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          line.realUnitPrice ?? line.unitPrice,
          line.chargedUnitPrice ?? line.unitPrice,
        )
      }

      const insertMovement = this.db.prepare(
        `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, reference_id)
         VALUES (?, 'sale', ?, 'sale', ?)`,
      )

      for (const exit of inventoryExits) {
        insertMovement.run(exit.productId, exit.quantity, saleId)
      }

      if (progressiveConsumptions.length) {
        const lots = new ProductLotRepository(this.db)
        for (const c of progressiveConsumptions) {
          lots.consumeProgressive(c.productId, c.amount, 'sale', saleId)
        }
      }

      const row = this.db.prepare('SELECT created_at FROM sales WHERE id = ?').get(saleId) as { created_at: string }
      return { id: saleId, total: chargedTotal, realTotal, chargedTotal, cashSessionId, createdAt: row.created_at }
    })

    return run()
  }

  /** Pago en efectivo + cierre de cuenta en una sola transacción. */
  settleTabWithPayment(cashSessionId: number, employeeId: number, total: number, tabId: number) {
    return this.db.transaction(() => {
      const saleResult = this.db
        .prepare(
          `INSERT INTO sales (cash_session_id, employee_id, sale_type, total, tab_id, real_total, charged_total)
           VALUES (?, ?, 'tab_payment', ?, ?, ?, ?)`,
        )
        .run(cashSessionId, employeeId, total, tabId, total, total)

      const saleId = Number(saleResult.lastInsertRowid)
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
        throw new ConflictError('La cuenta no pudo liquidarse (estado inesperado).')
      }
      const row = this.db.prepare('SELECT created_at FROM sales WHERE id = ?').get(saleId) as { created_at: string }
      return { id: saleId, total, realTotal: total, chargedTotal: total, cashSessionId, createdAt: row.created_at }
    })()
  }
}
