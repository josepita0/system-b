import type Database from 'better-sqlite3'
import type { UserDocument } from '../../shared/types/user'

function mapDocument(row: any): UserDocument {
  return {
    id: row.id,
    employeeId: row.employee_id,
    documentType: row.document_type,
    originalName: row.original_name,
    mimeType: row.mime_type,
    uploadedAt: row.uploaded_at,
    expiresAt: row.expires_at,
  }
}

export class DocumentRepository {
  constructor(private readonly db: Database.Database) {}

  listByEmployee(employeeId: number) {
    return this.db
      .prepare('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY uploaded_at DESC')
      .all(employeeId)
      .map(mapDocument)
  }

  getById(id: number) {
    const row = this.db.prepare('SELECT * FROM employee_documents WHERE id = ?').get(id)
    return row ? mapDocument(row) : null
  }

  create(input: {
    employeeId: number
    documentType: string
    filePath: string
    originalName: string
    mimeType: string
    encryptedMetadata: string
    expiresAt: string | null
  }) {
    const result = this.db
      .prepare(
        `INSERT INTO employee_documents (
          employee_id, document_type, file_path, original_name, mime_type, encrypted_metadata, expires_at
        ) VALUES (
          @employeeId, @documentType, @filePath, @originalName, @mimeType, @encryptedMetadata, @expiresAt
        )`,
      )
      .run(input)

    return this.getById(Number(result.lastInsertRowid))!
  }

  getRawById(id: number) {
    return this.db.prepare('SELECT * FROM employee_documents WHERE id = ?').get(id) as any
  }

  remove(id: number) {
    this.db.prepare('DELETE FROM employee_documents WHERE id = ?').run(id)
  }
}
