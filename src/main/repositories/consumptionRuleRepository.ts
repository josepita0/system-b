import type Database from 'better-sqlite3'
import type { SaleFormatConsumptionRule, SaleFormatConsumptionRuleInput } from '../../shared/types/consumptionRule'

type Row = {
  id: number
  product_id: number
  sale_format_id: number | null
  consume_quantity: number
  unit: string
  created_at: string
}

function mapRow(row: Row): SaleFormatConsumptionRule {
  return {
    id: row.id,
    productId: row.product_id,
    saleFormatId: row.sale_format_id,
    consumeQuantity: Number(row.consume_quantity),
    unit: row.unit,
    createdAt: row.created_at,
  }
}

export class ConsumptionRuleRepository {
  constructor(private readonly db: Database.Database) {}

  list() {
    const rows = this.db
      .prepare(
        `SELECT id, product_id, sale_format_id, consume_quantity, unit, created_at
         FROM sale_format_product_consumptions
         ORDER BY product_id ASC, sale_format_id ASC`,
      )
      .all() as Row[]
    return rows.map(mapRow)
  }

  getById(id: number) {
    const row = this.db
      .prepare(
        `SELECT id, product_id, sale_format_id, consume_quantity, unit, created_at
         FROM sale_format_product_consumptions
         WHERE id = ?`,
      )
      .get(id) as Row | undefined
    return row ? mapRow(row) : null
  }

  create(input: SaleFormatConsumptionRuleInput) {
    const payload = {
      productId: input.productId,
      saleFormatId: input.saleFormatId ?? null,
      consumeQuantity: input.consumeQuantity,
      unit: input.unit ?? 'ml',
    }
    const result = this.db
      .prepare(
        `INSERT INTO sale_format_product_consumptions (product_id, sale_format_id, consume_quantity, unit)
         VALUES (@productId, @saleFormatId, @consumeQuantity, @unit)`,
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
    }
    this.db
      .prepare(
        `UPDATE sale_format_product_consumptions
         SET product_id = @productId,
             sale_format_id = @saleFormatId,
             consume_quantity = @consumeQuantity,
             unit = @unit
         WHERE id = @id`,
      )
      .run(payload)
    return this.getById(id)!
  }

  remove(id: number) {
    this.db.prepare('DELETE FROM sale_format_product_consumptions WHERE id = ?').run(id)
  }
}

