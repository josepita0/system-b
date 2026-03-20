import type Database from 'better-sqlite3'
import type { SaleFormat, SaleFormatInput } from '../../shared/types/product'

type SaleFormatRow = {
  id: number
  code: string
  name: string
  sort_order: number
  is_active: number
  requires_complement: number
  complement_category_root_id: number | null
  complement_category_root_name: string | null
  created_at: string
  updated_at: string
}

function mapSaleFormat(row: SaleFormatRow): SaleFormat {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    requiresComplement: row.requires_complement,
    complementCategoryRootId: row.complement_category_root_id,
    complementCategoryRootName: row.complement_category_root_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SaleFormatRepository {
  constructor(private readonly db: Database.Database) {}

  private readonly baseSelect = `
    SELECT
      sf.*,
      c.name AS complement_category_root_name
    FROM sale_formats sf
    LEFT JOIN categories c ON c.id = sf.complement_category_root_id
  `

  list() {
    return this.db
      .prepare(`${this.baseSelect} WHERE sf.is_active = 1 ORDER BY sf.sort_order ASC, sf.name ASC`)
      .all()
      .map((row: any) => mapSaleFormat(row))
  }

  getById(id: number) {
    const row = this.db.prepare(`${this.baseSelect} WHERE sf.id = ?`).get(id) as SaleFormatRow | undefined
    return row ? mapSaleFormat(row) : null
  }

  getByCode(code: string) {
    const row = this.db.prepare(`${this.baseSelect} WHERE lower(sf.code) = lower(?)`).get(code) as SaleFormatRow | undefined
    return row ? mapSaleFormat(row) : null
  }

  create(input: SaleFormatInput) {
    const result = this.db
      .prepare(
        `INSERT INTO sale_formats (code, name, sort_order, requires_complement, complement_category_root_id)
         VALUES (@code, @name, @sortOrder, @requiresComplement, @complementCategoryRootId)`,
      )
      .run({
        ...input,
        requiresComplement: input.requiresComplement ? 1 : 0,
        complementCategoryRootId: input.complementCategoryRootId ?? null,
      })

    return this.getById(Number(result.lastInsertRowid))!
  }

  update(input: SaleFormatInput & { id: number }) {
    this.db
      .prepare(
        `UPDATE sale_formats
         SET code = @code,
             name = @name,
             sort_order = @sortOrder,
             requires_complement = @requiresComplement,
             complement_category_root_id = @complementCategoryRootId,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`,
      )
      .run({
        ...input,
        requiresComplement: input.requiresComplement ? 1 : 0,
        complementCategoryRootId: input.complementCategoryRootId ?? null,
      })

    return this.getById(input.id)!
  }

  softDelete(id: number) {
    const run = this.db.transaction((targetId: number) => {
      this.db.prepare('UPDATE sale_formats SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(targetId)
      this.db.prepare('DELETE FROM category_sale_formats WHERE sale_format_id = ?').run(targetId)
    })

    run(id)
  }

  existsActive(id: number) {
    const row = this.db.prepare('SELECT id FROM sale_formats WHERE id = ? AND is_active = 1').get(id) as { id: number } | undefined
    return Boolean(row)
  }
}
