import type Database from 'better-sqlite3'
import type { GalleryImage, GalleryImageListParams, GalleryImageListResult, GalleryImageMetadataPatch } from '../../shared/types/imageGallery'

type ImageRow = {
  id: number
  original_name: string
  stored_relpath: string
  mime: string
  size_bytes: number
  width: number | null
  height: number | null
  sha256: string | null
  name: string | null
  description: string | null
  category: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: ImageRow): GalleryImage {
  return {
    id: row.id,
    originalName: row.original_name,
    storedRelPath: row.stored_relpath,
    mime: row.mime,
    sizeBytes: row.size_bytes,
    width: row.width ?? null,
    height: row.height ?? null,
    sha256: row.sha256 ?? null,
    name: row.name ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ImageRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    originalName: string
    storedRelPath: string
    mime: string
    sizeBytes: number
    width?: number | null
    height?: number | null
    sha256?: string | null
    name?: string | null
    description?: string | null
    category?: string | null
  }) {
    const result = this.db
      .prepare(
        `INSERT INTO images (
          original_name,
          stored_relpath,
          mime,
          size_bytes,
          width,
          height,
          sha256,
          name,
          description,
          category
        ) VALUES (
          @originalName,
          @storedRelPath,
          @mime,
          @sizeBytes,
          @width,
          @height,
          @sha256,
          @name,
          @description,
          @category
        )`,
      )
      .run({
        ...input,
        width: input.width ?? null,
        height: input.height ?? null,
        sha256: input.sha256 ?? null,
        name: input.name ?? null,
        description: input.description ?? null,
        category: input.category ?? null,
      })

    return this.getById(Number(result.lastInsertRowid))!
  }

  updateRelPath(id: number, storedRelPath: string) {
    this.db
      .prepare('UPDATE images SET stored_relpath = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(storedRelPath, id)
    return this.getById(id)!
  }

  patchMetadata(id: number, patch: GalleryImageMetadataPatch) {
    const assignments: string[] = []
    const values: Record<string, unknown> = { id }

    if (patch.name !== undefined) {
      assignments.push('name = @name')
      values.name = patch.name
    }
    if (patch.description !== undefined) {
      assignments.push('description = @description')
      values.description = patch.description
    }
    if (patch.category !== undefined) {
      assignments.push('category = @category')
      values.category = patch.category
    }
    if (assignments.length === 0) {
      return this.getById(id)
    }

    assignments.push('updated_at = CURRENT_TIMESTAMP')
    this.db.prepare(`UPDATE images SET ${assignments.join(', ')} WHERE id = @id`).run(values)
    return this.getById(id)
  }

  getById(id: number) {
    const row = this.db.prepare('SELECT * FROM images WHERE id = ?').get(id) as ImageRow | undefined
    return row ? mapRow(row) : null
  }

  getByStoredRelPath(storedRelPath: string) {
    const row = this.db.prepare('SELECT * FROM images WHERE stored_relpath = ?').get(storedRelPath) as ImageRow | undefined
    return row ? mapRow(row) : null
  }

  list(params: GalleryImageListParams): GalleryImageListResult {
    const pageSize = Math.max(1, Math.min(200, Math.floor(params.pageSize ?? 48)))
    const page = Math.max(1, Math.floor(params.page ?? 1))
    const offset = (page - 1) * pageSize

    const parts: string[] = []
    const values: unknown[] = []

    const q = params.q?.trim()
    if (q) {
      parts.push('(INSTR(LOWER(COALESCE(name, "")), LOWER(?)) > 0 OR INSTR(LOWER(original_name), LOWER(?)) > 0)')
      values.push(q, q)
    }
    if (params.category !== undefined) {
      if (params.category == null || String(params.category).trim() === '') {
        parts.push('(category IS NULL OR TRIM(category) = "")')
      } else {
        parts.push('category = ?')
        values.push(params.category)
      }
    }

    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : ''

    const total = (
      this.db.prepare(`SELECT COUNT(*) AS c FROM images ${where}`).get(...values) as { c: number }
    ).c

    const rows = this.db
      .prepare(`SELECT * FROM images ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...values, pageSize, offset) as ImageRow[]

    return { items: rows.map(mapRow), total, page, pageSize }
  }

  deleteByIds(ids: number[]) {
    if (ids.length === 0) return
    const placeholders = ids.map(() => '?').join(', ')
    this.db.prepare(`DELETE FROM images WHERE id IN (${placeholders})`).run(...ids)
  }

  listByIds(ids: number[]) {
    if (ids.length === 0) return []
    const placeholders = ids.map(() => '?').join(', ')
    const rows = this.db.prepare(`SELECT * FROM images WHERE id IN (${placeholders})`).all(...ids) as ImageRow[]
    return rows.map(mapRow)
  }
}

