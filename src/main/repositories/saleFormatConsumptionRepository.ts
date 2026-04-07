import type Database from 'better-sqlite3'

export type SaleFormatConsumptionRow = {
  productId: number
  consumeQuantity: number
  unit: string
  basePrice: number | null
}

export class SaleFormatConsumptionRepository {
  constructor(private readonly db: Database.Database) {}

  listForProductAndFormat(productId: number, saleFormatId: number | null) {
    if (saleFormatId == null) {
      return this.db
        .prepare(
          `SELECT
             product_id AS productId,
             consume_quantity AS consumeQuantity,
             unit,
             base_price AS basePrice
           FROM sale_format_product_consumptions
           WHERE product_id = ? AND sale_format_id IS NULL
           ORDER BY id ASC`,
        )
        .all(productId) as SaleFormatConsumptionRow[]
    }

    return this.db
      .prepare(
        `SELECT
           product_id AS productId,
           consume_quantity AS consumeQuantity,
           unit,
           base_price AS basePrice
         FROM sale_format_product_consumptions
         WHERE product_id = ? AND sale_format_id = ?
         ORDER BY id ASC`,
      )
      .all(productId, saleFormatId) as SaleFormatConsumptionRow[]
  }
}

