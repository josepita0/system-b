import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    const filePath = item.filePath
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
  }
})

describe('database migrations', () => {
  it('runs all migrations from a clean database', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-migrations-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row: any) => row.name)

    expect(tables).toContain('products')
    expect(tables).toContain('cash_sessions')
    expect(tables).toContain('report_jobs')
    expect(tables).toContain('auth_sessions')
    expect(tables).toContain('employee_documents')
    expect(tables).toContain('license_activations')
    expect(tables).toContain('categories')
    expect(tables).toContain('sale_formats')
    expect(tables).toContain('category_sale_formats')
    expect(tables).toContain('customer_tabs')

    const categoryColumns = db.pragma('table_info(categories)') as Array<{ name: string }>
    expect(categoryColumns.map((column) => column.name)).toContain('supports_children')
    expect(categoryColumns.map((column) => column.name)).toContain('inherits_sale_formats')
    expect(categoryColumns.map((column) => column.name)).toContain('structure_locked')
  })
})
