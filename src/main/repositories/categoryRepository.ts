import type Database from 'better-sqlite3'
import type { Category, CategoryInput } from '../../shared/types/product'

type CategoryRow = {
  id: number
  name: string
  slug: string
  parent_id: number | null
  structure_locked: number
  supports_children: number
  inherits_sale_formats: number
  sort_order: number
  is_active: number
  created_at: string
  updated_at: string
}

type CategoryStatsRow = CategoryRow & {
  assigned_sale_format_ids: string | null
  product_count: number
  parent_name: string | null
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    structureLocked: row.structure_locked,
    supportsChildren: row.supports_children,
    inheritsSaleFormats: row.inherits_sale_formats,
    assignedSaleFormatIds: [],
    effectiveSaleFormatIds: [],
    inheritedFromCategoryId: null,
    inheritedFromCategoryName: null,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CategoryRepository {
  constructor(private readonly db: Database.Database) {}

  list() {
    return this.db
      .prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY parent_id IS NOT NULL, sort_order ASC, name ASC')
      .all()
      .map((row: any) => mapCategory(row))
  }

  listWithStats() {
    return this.db
      .prepare(
        `SELECT
           c.*,
           parent.name AS parent_name,
           (
             SELECT GROUP_CONCAT(csf.sale_format_id)
             FROM category_sale_formats csf
             INNER JOIN sale_formats sf ON sf.id = csf.sale_format_id
             WHERE csf.category_id = c.id
               AND sf.is_active = 1
           ) AS assigned_sale_format_ids,
           (
             SELECT COUNT(*)
             FROM products p
             WHERE p.category_id = c.id
               AND p.is_active = 1
           ) AS product_count
         FROM categories c
         LEFT JOIN categories parent ON parent.id = c.parent_id
         WHERE c.is_active = 1
         ORDER BY c.parent_id IS NOT NULL, c.sort_order ASC, c.name ASC`,
      )
      .all() as CategoryStatsRow[]
  }

  listRootCategories() {
    return this.db
      .prepare('SELECT * FROM categories WHERE is_active = 1 AND parent_id IS NULL ORDER BY sort_order ASC, name ASC')
      .all()
      .map((row: any) => mapCategory(row))
  }

  getById(id: number) {
    const row = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined
    return row ? mapCategory(row) : null
  }

  getBySlug(slug: string) {
    const row = this.db.prepare('SELECT * FROM categories WHERE lower(slug) = lower(?)').get(slug) as CategoryRow | undefined
    return row ? mapCategory(row) : null
  }

  create(input: CategoryInput) {
    const result = this.db
      .prepare(
        `INSERT INTO categories (name, slug, parent_id, supports_children, inherits_sale_formats, sort_order)
         VALUES (@name, @slug, @parentId, @supportsChildren, @inheritsSaleFormats, @sortOrder)`,
      )
      .run({
        ...input,
        parentId: input.parentId ?? null,
        supportsChildren: input.supportsChildren ? 1 : 0,
        inheritsSaleFormats: input.inheritsSaleFormats ? 1 : 0,
      })

    return this.getById(Number(result.lastInsertRowid))!
  }

  update(input: CategoryInput & { id: number }) {
    this.db
      .prepare(
        `UPDATE categories
         SET name = @name,
             slug = @slug,
             parent_id = @parentId,
             supports_children = @supportsChildren,
             inherits_sale_formats = @inheritsSaleFormats,
             sort_order = @sortOrder,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`,
      )
      .run({
        ...input,
        parentId: input.parentId ?? null,
        supportsChildren: input.supportsChildren ? 1 : 0,
        inheritsSaleFormats: input.inheritsSaleFormats ? 1 : 0,
      })

    return this.getById(input.id)!
  }

  softDelete(id: number) {
    this.db.prepare('UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    this.db.prepare('DELETE FROM category_sale_formats WHERE category_id = ?').run(id)
  }

  lockStructure(id: number) {
    this.db.prepare('UPDATE categories SET structure_locked = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
  }

  countActiveChildren(id: number) {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM categories WHERE parent_id = ? AND is_active = 1')
      .get(id) as { count: number }
    return row.count
  }

  countActiveProducts(id: number) {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND is_active = 1')
      .get(id) as { count: number }
    return row.count
  }

  replaceSaleFormats(categoryId: number, saleFormatIds: number[]) {
    const run = this.db.transaction((targetCategoryId: number, targetIds: number[]) => {
      this.db.prepare('DELETE FROM category_sale_formats WHERE category_id = ?').run(targetCategoryId)
      const insert = this.db.prepare('INSERT INTO category_sale_formats (category_id, sale_format_id) VALUES (?, ?)')
      for (const saleFormatId of targetIds) {
        insert.run(targetCategoryId, saleFormatId)
      }
    })

    run(categoryId, saleFormatIds)
  }

  listSaleFormatIds(categoryId: number) {
    return this.db
      .prepare(
        `SELECT sale_format_id
         FROM category_sale_formats
         WHERE category_id = ?
         ORDER BY sale_format_id ASC`,
      )
      .all(categoryId)
      .map((row: any) => Number(row.sale_format_id))
  }

  getDescendantIds(id: number) {
    const rows = this.db
      .prepare(
        `WITH RECURSIVE category_tree(id) AS (
           SELECT id FROM categories WHERE parent_id = ?
           UNION ALL
           SELECT c.id
           FROM categories c
           INNER JOIN category_tree ct ON c.parent_id = ct.id
         )
         SELECT id FROM category_tree`,
      )
      .all(id) as Array<{ id: number }>

    return rows.map((row) => row.id)
  }
}
