import type Database from 'better-sqlite3'
import type { VipCustomer, VipCustomerInput } from '../../shared/types/vipCustomer'

type VipCustomerRow = {
  id: number
  name: string
  document_id: string | null
  phone: string | null
  notes: string | null
  condition_type: VipCustomer['conditionType']
  is_active: number
  created_at: string
  updated_at: string
}

function mapRow(row: VipCustomerRow): VipCustomer {
  return {
    id: row.id,
    name: row.name,
    documentId: row.document_id,
    phone: row.phone,
    notes: row.notes,
    conditionType: row.condition_type,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class VipCustomerRepository {
  constructor(private readonly db: Database.Database) {}

  list() {
    const rows = this.db
      .prepare('SELECT * FROM vip_customers WHERE is_active = 1 ORDER BY name ASC')
      .all() as VipCustomerRow[]
    return rows.map(mapRow)
  }

  private buildWhere(search?: string) {
    const raw = search?.trim()
    if (!raw) {
      return { where: 'WHERE is_active = 1', params: [] as unknown[] }
    }
    return {
      where:
        "WHERE is_active = 1 AND (INSTR(LOWER(name), LOWER(?)) > 0 OR INSTR(LOWER(COALESCE(document_id,'')), LOWER(?)) > 0 OR INSTR(LOWER(COALESCE(phone,'')), LOWER(?)) > 0)",
      params: [raw, raw, raw] as unknown[],
    }
  }

  countActive(search?: string) {
    const { where, params } = this.buildWhere(search)
    const row = this.db.prepare(`SELECT COUNT(*) AS c FROM vip_customers ${where}`).get(...params) as { c: number }
    return row.c
  }

  listPaged(limit: number, offset: number, search?: string) {
    const { where, params } = this.buildWhere(search)
    const rows = this.db
      .prepare(`SELECT * FROM vip_customers ${where} ORDER BY name ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as VipCustomerRow[]
    return rows.map(mapRow)
  }

  getById(id: number) {
    const row = this.db.prepare('SELECT * FROM vip_customers WHERE id = ?').get(id) as VipCustomerRow | undefined
    return row ? mapRow(row) : null
  }

  create(input: VipCustomerInput) {
    const payload = {
      name: input.name,
      documentId: input.documentId ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      conditionType: input.conditionType,
    }

    const result = this.db
      .prepare(
        `INSERT INTO vip_customers (name, document_id, phone, notes, condition_type)
         VALUES (@name, @documentId, @phone, @notes, @conditionType)`,
      )
      .run(payload)

    return this.getById(Number(result.lastInsertRowid))!
  }

  update(id: number, input: VipCustomerInput) {
    const payload = {
      id,
      name: input.name,
      documentId: input.documentId ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      conditionType: input.conditionType,
      isActive: input.isActive ?? true,
    }

    this.db
      .prepare(
        `UPDATE vip_customers
         SET name = @name,
             document_id = @documentId,
             phone = @phone,
             notes = @notes,
             condition_type = @conditionType,
             is_active = CASE WHEN @isActive THEN 1 ELSE 0 END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`,
      )
      .run(payload)

    return this.getById(id)!
  }

  softDelete(id: number) {
    this.db.prepare('UPDATE vip_customers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
  }
}

