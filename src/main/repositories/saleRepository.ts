import type Database from 'better-sqlite3'
import { ConflictError, ValidationError } from '../errors'
import { ProductInventoryRepository } from './productInventoryRepository'
import { ProductLotRepository } from './productLotRepository'
import type { SaleFormatConsumptionRepository } from './saleFormatConsumptionRepository'

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

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
  priceChangeNote?: string | null
}

export type InventoryExitInsert = {
  productId: number
  quantity: number
  referenceType?: string
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
           real_unit_price, charged_unit_price,
           price_change_note
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          line.priceChangeNote ?? null,
        )
      }

      const insertMovement = this.db.prepare(
        `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, reference_id)
         VALUES (?, 'sale', ?, ?, ?)`,
      )

      for (const exit of inventoryExits) {
        insertMovement.run(exit.productId, exit.quantity, exit.referenceType ?? 'sale', saleId)
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

  /**
   * Quita una línea de un cargo a cuenta abierto y revierte inventario (unidad o consumo progresivo).
   */
  removeTabChargeSaleItem(saleItemId: number, consumptions: SaleFormatConsumptionRepository): { tabId: number; newBalance: number } {
    type LineRow = {
      sale_id: number
      product_id: number
      quantity: number
      subtotal: number
      sale_format_id: number | null
      sale_type: string
      tab_id: number
    }

    const row = this.db
      .prepare(
        `SELECT si.sale_id AS sale_id, si.product_id AS product_id, si.quantity AS quantity, si.subtotal AS subtotal,
                si.sale_format_id AS sale_format_id, s.sale_type AS sale_type, s.tab_id AS tab_id
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         WHERE si.id = ?`,
      )
      .get(saleItemId) as LineRow | undefined

    if (!row) {
      throw new ValidationError('Linea no encontrada.')
    }
    if (row.sale_type !== 'tab_charge') {
      throw new ValidationError('Solo se pueden quitar lineas de cargos a cuenta.')
    }

    const tabStatus = this.db.prepare('SELECT status FROM customer_tabs WHERE id = ?').get(row.tab_id) as
      | { status: string }
      | undefined
    if (!tabStatus || tabStatus.status !== 'open') {
      throw new ValidationError('La cuenta no esta abierta.')
    }

    const product = this.db
      .prepare(`SELECT id, type, consumption_mode FROM products WHERE id = ?`)
      .get(row.product_id) as { id: number; type: string; consumption_mode: string } | undefined

    const inventory = new ProductInventoryRepository(this.db)
    const lots = new ProductLotRepository(this.db)

    const run = this.db.transaction(() => {
      if (product?.type === 'simple') {
        if (product.consumption_mode === 'unit') {
          inventory.insertMovement({
            productId: row.product_id,
            movementType: 'adjustment',
            quantity: row.quantity,
            referenceType: 'tab_charge_line_removal',
            referenceId: saleItemId,
            note: 'Devolucion por quitar linea de cuenta',
          })
        } else if (product.consumption_mode === 'progressive') {
          const consumptionRows = consumptions.listForProductAndFormat(row.product_id, row.sale_format_id)
          const fallbackRows =
            consumptionRows.length === 0 && row.sale_format_id != null
              ? consumptions.listForProductAndFormat(row.product_id, null)
              : consumptionRows
          if (fallbackRows.length) {
            const c = fallbackRows[0]
            if (c.unit !== 'ml') {
              throw new ValidationError('Consumo no soportado para esta linea.')
            }
            const amount = row.quantity * c.consumeQuantity
            try {
              lots.adjustOpenLotRemaining(row.product_id, amount, 'tab_line_removal', saleItemId)
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Error de inventario'
              throw new ValidationError(
                `No se pudo revertir el consumo progresivo (${msg}). Pruebe otra linea o contacte al administrador.`,
              )
            }
          }
        }
      }

      this.db.prepare('DELETE FROM sale_items WHERE id = ?').run(saleItemId)

      const sumRow = this.db
        .prepare('SELECT COALESCE(SUM(subtotal), 0) AS s FROM sale_items WHERE sale_id = ?')
        .get(row.sale_id) as { s: number }
      const newSum = roundMoney(Number(sumRow.s))

      if (newSum < 0.0001) {
        this.db.prepare('DELETE FROM sales WHERE id = ?').run(row.sale_id)
      } else {
        this.db
          .prepare('UPDATE sales SET total = ?, real_total = ?, charged_total = ? WHERE id = ?')
          .run(newSum, newSum, newSum, row.sale_id)
      }
    })

    run()

    const balRow = this.db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) AS t FROM sales WHERE tab_id = ? AND sale_type = 'tab_charge'`,
      )
      .get(row.tab_id) as { t: number }

    return { tabId: row.tab_id, newBalance: roundMoney(Number(balRow.t)) }
  }
}
