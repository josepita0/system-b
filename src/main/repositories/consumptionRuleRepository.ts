import type Database from 'better-sqlite3'
import type { SaleFormatConsumptionRule, SaleFormatConsumptionRuleInput } from '../../shared/types/consumptionRule'

type Row = {
  id: number
  product_id: number
  sale_format_id: number | null
  consume_quantity: number
  unit: string
  base_price: number | null
  created_at: string
}

function mapRow(row: Row): SaleFormatConsumptionRule {
  return {
    id: row.id,
    productId: row.product_id,
    saleFormatId: row.sale_format_id,
    consumeQuantity: Number(row.consume_quantity),
    unit: row.unit,
    basePrice: row.base_price != null ? Number(row.base_price) : null,
    createdAt: row.created_at,
  }
}

const baseSelect = `SELECT id, product_id, sale_format_id, consume_quantity, unit, base_price, created_at
         FROM sale_format_product_consumptions`

export class ConsumptionRuleRepository {
  constructor(private readonly db: Database.Database) {}

  list() {
    const rows = this.db.prepare(`${baseSelect} ORDER BY product_id ASC, sale_format_id ASC`).all() as Row[]
    return rows.map(mapRow)
  }

  getById(id: number) {
    const row = this.db.prepare(`${baseSelect} WHERE id = ?`).get(id) as Row | undefined
    return row ? mapRow(row) : null
  }

  /** Regla por producto y formato concreto (sale_format_id no null). */
  getByProductAndSaleFormat(productId: number, saleFormatId: number) {
    const row = this.db
      .prepare(`${baseSelect} WHERE product_id = ? AND sale_format_id = ?`)
      .get(productId, saleFormatId) as Row | undefined
    return row ? mapRow(row) : null
  }

  create(input: SaleFormatConsumptionRuleInput) {
    const payload = {
      productId: input.productId,
      saleFormatId: input.saleFormatId ?? null,
      consumeQuantity: input.consumeQuantity,
      unit: input.unit ?? 'ml',
      basePrice: input.basePrice ?? null,
    }
    const result = this.db
      .prepare(
        `INSERT INTO sale_format_product_consumptions (product_id, sale_format_id, consume_quantity, unit, base_price)
         VALUES (@productId, @saleFormatId, @consumeQuantity, @unit, @basePrice)`,
      )
      .run(payload)
    return this.getById(Number(result.lastInsertRowid))!
  }

  update(id: number, input: SaleFormatConsumptionRuleInput) {
    const payload = {
      id,
      productId: input.productId,
      saleFormatId: input.saleFormatId ?? null,
      consumeQuantity: input.consumeQuantity,
      unit: input.unit ?? 'ml',
      basePrice: input.basePrice ?? null,
    }
    this.db
      .prepare(
        `UPDATE sale_format_product_consumptions
         SET product_id = @productId,
             sale_format_id = @saleFormatId,
             consume_quantity = @consumeQuantity,
             unit = @unit,
             base_price = @basePrice
         WHERE id = @id`,
      )
      .run(payload)
    return this.getById(id)!
  }

  remove(id: number) {
    this.db.prepare('DELETE FROM sale_format_product_consumptions WHERE id = ?').run(id)
  }

  deleteByProductAndSaleFormat(productId: number, saleFormatId: number) {
    this.db
      .prepare('DELETE FROM sale_format_product_consumptions WHERE product_id = ? AND sale_format_id = ?')
      .run(productId, saleFormatId)
  }

  upsertProductFormatRule(
    productId: number,
    saleFormatId: number,
    consumeQuantity: number,
    unit: string,
    basePrice: number | null,
  ) {
    const existing = this.getByProductAndSaleFormat(productId, saleFormatId)
    if (existing) {
      return this.update(existing.id, {
        productId,
        saleFormatId,
        consumeQuantity,
        unit,
        basePrice,
      })
    }
    return this.create({
      productId,
      saleFormatId,
      consumeQuantity,
      unit,
      basePrice,
    })
  }
}
