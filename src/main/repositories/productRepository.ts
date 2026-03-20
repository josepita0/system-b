import type Database from 'better-sqlite3'
import type { Product, ProductInput, ProductUpdateInput } from '../../shared/types/product'

function mapRow(row: any): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    type: row.type,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    salePrice: row.sale_price,
    minStock: row.min_stock,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ProductRepository {
  constructor(private readonly db: Database.Database) {}

  private readonly baseSelect = `
    SELECT
      p.*,
      c.name AS category_name,
      c.slug AS category_slug
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
  `

  list(categoryId?: number) {
    const whereCategory = typeof categoryId === 'number' ? ' AND p.category_id = ?' : ''
    return this.db
      .prepare(`${this.baseSelect} WHERE p.is_active = 1${whereCategory} ORDER BY p.name ASC`)
      .all(...(typeof categoryId === 'number' ? [categoryId] : []))
      .map(mapRow)
  }

  getById(id: number) {
    const row = this.db.prepare(`${this.baseSelect} WHERE p.id = ?`).get(id)
    return row ? mapRow(row) : null
  }

  getBySku(sku: string) {
    const row = this.db.prepare(`${this.baseSelect} WHERE p.sku = ?`).get(sku)
    return row ? mapRow(row) : null
  }

  create(input: ProductInput) {
    const result = this.db
      .prepare(
        `INSERT INTO products (sku, name, type, category_id, sale_price, min_stock)
         VALUES (@sku, @name, @type, @categoryId, @salePrice, @minStock)`,
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
             category_id = @categoryId,
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
