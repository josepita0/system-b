import type Database from 'better-sqlite3'
import type { Product, ProductInput, ProductUpdateInput } from '../../shared/types/product'

function mapRow(row: any): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    type: row.type,
    salePrice: row.sale_price,
    minStock: row.min_stock,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ProductRepository {
  constructor(private readonly db: Database.Database) {}

  list() {
    return this.db
      .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC')
      .all()
      .map(mapRow)
  }

  getById(id: number) {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    return row ? mapRow(row) : null
  }

  getBySku(sku: string) {
    const row = this.db.prepare('SELECT * FROM products WHERE sku = ?').get(sku)
    return row ? mapRow(row) : null
  }

  create(input: ProductInput) {
    const result = this.db
      .prepare(
        `INSERT INTO products (sku, name, type, sale_price, min_stock)
         VALUES (@sku, @name, @type, @salePrice, @minStock)`,
      )
      .run(input)

    return this.getById(Number(result.lastInsertRowid))!
  }

  update(input: ProductUpdateInput) {
    this.db
      .prepare(
        `UPDATE products
         SET sku = @sku,
             name = @name,
             type = @type,
             sale_price = @salePrice,
             min_stock = @minStock,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`,
      )
      .run(input)

    return this.getById(input.id)!
  }

  softDelete(id: number) {
    this.db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
  }
}
