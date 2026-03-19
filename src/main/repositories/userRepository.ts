import type Database from 'better-sqlite3'
import type { User } from '../../shared/types/user'

type UserRow = {
  id: number
  first_name: string
  last_name: string
  document_id: string | null
  email: string | null
  username: string | null
  role: User['role']
  is_active: number
  must_change_password: number
  last_login_at: string | null
  created_at: string
  updated_at: string
  password_hash?: string | null
  failed_login_attempts?: number
  locked_until?: string | null
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    documentId: row.document_id,
    email: row.email,
    username: row.username,
    role: row.role,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class UserRepository {
  constructor(private readonly db: Database.Database) {}

  countAdmins() {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM employees WHERE role = 'admin'").get() as { count: number }
    return row.count
  }

  list() {
    return this.db.prepare('SELECT * FROM employees ORDER BY role DESC, first_name ASC, last_name ASC').all().map((row: any) => mapUser(row))
  }

  getById(id: number) {
    const row = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as UserRow | undefined
    return row ? mapUser(row) : null
  }

  getAuthByIdentifier(identifier: string) {
    const row = this.db
      .prepare(
        `SELECT *
         FROM employees
         WHERE lower(username) = lower(?)
            OR lower(email) = lower(?)`,
      )
      .get(identifier, identifier) as UserRow | undefined

    return row ?? null
  }

  getAuthById(id: number) {
    const row = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as UserRow | undefined
    return row ?? null
  }

  create(input: {
    firstName: string
    lastName: string
    documentId: string | null
    email: string | null
    username: string
    role: User['role']
    passwordHash: string | null
    mustChangePassword: number
  }) {
    const result = this.db
      .prepare(
        `INSERT INTO employees (
          first_name, last_name, document_id, email, username, role, password_hash, must_change_password
        ) VALUES (
          @firstName, @lastName, @documentId, @email, @username, @role, @passwordHash, @mustChangePassword
        )`,
      )
      .run(input)

    return this.getById(Number(result.lastInsertRowid))!
  }

  update(input: {
    id: number
    firstName: string
    lastName: string
    documentId: string | null
    email: string | null
    username: string
    role: User['role']
    isActive: number
  }) {
    this.db
      .prepare(
        `UPDATE employees
         SET first_name = @firstName,
             last_name = @lastName,
             document_id = @documentId,
             email = @email,
             username = @username,
             role = @role,
             is_active = @isActive,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`,
      )
      .run(input)

    return this.getById(input.id)!
  }

  setPassword(userId: number, passwordHash: string, mustChangePassword = 0) {
    this.db
      .prepare(
        `UPDATE employees
         SET password_hash = ?,
             failed_login_attempts = 0,
             locked_until = NULL,
             password_changed_at = CURRENT_TIMESTAMP,
             must_change_password = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(passwordHash, mustChangePassword, userId)
  }

  markLoginSuccess(userId: number) {
    this.db
      .prepare(
        `UPDATE employees
         SET last_login_at = CURRENT_TIMESTAMP,
             failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(userId)
  }

  markLoginFailure(userId: number, lockUntil: string | null) {
    this.db
      .prepare(
        `UPDATE employees
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = COALESCE(?, locked_until),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(lockUntil, userId)
  }
}
