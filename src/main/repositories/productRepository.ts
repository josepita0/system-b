import type Database from 'better-sqlite3'
import type { Product, ProductInput, ProductUpdateInput } from '../../shared/types/product'

type ProductRow = {
  id: number
  sku: string
  name: string
  type: Product['type']
  category_id: number
  category_name: string
  category_slug: string
  consumption_mode: string
  sale_price: number
  min_stock: number
  is_active: number
  image_relpath: string | null
  image_mime: string | null
  pdf_relpath: string | null
  pdf_mime: string | null
  pdf_original_name: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    type: row.type,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    consumptionMode: row.consumption_mode === 'progressive' ? 'progressive' : 'unit',
    salePrice: row.sale_price,
    minStock: row.min_stock,
    isActive: row.is_active,
    imageRelPath: row.image_relpath ?? null,
    imageMime: row.image_mime ?? null,
    pdfRelPath: row.pdf_relpath ?? null,
    pdfMime: row.pdf_mime ?? null,
    pdfOriginalName: row.pdf_original_name ?? null,
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
    const rows = this.db
      .prepare(`${this.baseSelect} WHERE p.is_active = 1${whereCategory} ORDER BY p.name ASC`)
      .all(...(typeof categoryId === 'number' ? [categoryId] : [])) as ProductRow[]

    return rows.map(mapRow)
  }

  listInCategories(categoryIds: number[]) {
    if (categoryIds.length === 0) {
      return []
    }
    const placeholders = categoryIds.map(() => '?').join(', ')
    const rows = this.db
      .prepare(`${this.baseSelect} WHERE p.is_active = 1 AND p.category_id IN (${placeholders}) ORDER BY p.name ASC`)
      .all(...categoryIds) as ProductRow[]

    return rows.map(mapRow)
  }

  private buildListActiveWhere(categoryId?: number, search?: string) {
    const parts = ['p.is_active = 1']
    const params: unknown[] = []
    if (typeof categoryId === 'number') {
      parts.push('p.category_id = ?')
      params.push(categoryId)
    }
    const raw = search?.trim()
    if (raw) {
      parts.push('(INSTR(LOWER(p.name), LOWER(?)) > 0 OR INSTR(LOWER(p.sku), LOWER(?)) > 0)')
      params.push(raw, raw)
    }
    return { where: `WHERE ${parts.join(' AND ')}`, params }
  }

  countListPaged(categoryId: number | undefined, search: string | undefined) {
    const { where, params } = this.buildListActiveWhere(categoryId, search)
    const row = this.db
      .prepare(`SELECT COUNT(*) AS c FROM products p INNER JOIN categories c ON c.id = p.category_id ${where}`)
      .get(...params) as { c: number }
    return row.c
  }

  listPaged(categoryId: number | undefined, search: string | undefined, limit: number, offset: number) {
    const { where, params } = this.buildListActiveWhere(categoryId, search)
    const rows = this.db
      .prepare(`${this.baseSelect} ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as ProductRow[]

    return rows.map(mapRow)
  }

  private buildProgressiveWhere(search?: string) {
    const parts = ["p.is_active = 1", "p.consumption_mode = 'progressive'"]
    const params: unknown[] = []
    const raw = search?.trim()
    if (raw) {
      parts.push('(INSTR(LOWER(p.name), LOWER(?)) > 0 OR INSTR(LOWER(p.sku), LOWER(?)) > 0)')
      params.push(raw, raw)
    }
    return { where: `WHERE ${parts.join(' AND ')}`, params }
  }

  countProgressivePaged(search: string | undefined) {
    const { where, params } = this.buildProgressiveWhere(search)
    const row = this.db
      .prepare(`SELECT COUNT(*) AS c FROM products p INNER JOIN categories c ON c.id = p.category_id ${where}`)
      .get(...params) as { c: number }
    return row.c
  }

  listProgressivePaged(search: string | undefined, limit: number, offset: number) {
    const { where, params } = this.buildProgressiveWhere(search)
    const rows = this.db
      .prepare(`${this.baseSelect} ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as ProductRow[]

    return rows.map(mapRow)
  }

  getById(id: number) {
    const row = this.db.prepare(`${this.baseSelect} WHERE p.id = ?`).get(id) as ProductRow | undefined
    return row ? mapRow(row) : null
  }

  getBySku(sku: string) {
    const row = this.db.prepare(`${this.baseSelect} WHERE p.sku = ?`).get(sku) as ProductRow | undefined
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

  patchMedia(
    id: number,
    patch: {
      imageRelPath?: string | null
      imageMime?: string | null
      pdfRelPath?: string | null
      pdfMime?: string | null
      pdfOriginalName?: string | null
    },
  ) {
    const assignments: string[] = []
    const values: Record<string, unknown> = { id }
    if (patch.imageRelPath !== undefined) {
      assignments.push('image_relpath = @imageRelPath')
      values.imageRelPath = patch.imageRelPath
    }
    if (patch.imageMime !== undefined) {
      assignments.push('image_mime = @imageMime')
      values.imageMime = patch.imageMime
    }
    if (patch.pdfRelPath !== undefined) {
      assignments.push('pdf_relpath = @pdfRelPath')
      values.pdfRelPath = patch.pdfRelPath
    }
    if (patch.pdfMime !== undefined) {
      assignments.push('pdf_mime = @pdfMime')
      values.pdfMime = patch.pdfMime
    }
    if (patch.pdfOriginalName !== undefined) {
      assignments.push('pdf_original_name = @pdfOriginalName')
      values.pdfOriginalName = patch.pdfOriginalName
    }
    if (assignments.length === 0) {
      return
    }
    assignments.push('updated_at = CURRENT_TIMESTAMP')
    this.db
      .prepare(`UPDATE products SET ${assignments.join(', ')} WHERE id = @id`)
      .run(values)
  }
}
