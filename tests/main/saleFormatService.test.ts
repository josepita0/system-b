import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { CategoryRepository } from '../../src/main/repositories/categoryRepository'
import { SaleFormatRepository } from '../../src/main/repositories/saleFormatRepository'
import { SaleFormatService } from '../../src/main/services/saleFormatService'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    fs.rmSync(path.dirname(item.filePath), { recursive: true, force: true })
  }
})

describe('SaleFormatService', () => {
  it('creates formats that require complement from a root category', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-formats-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const categories = new CategoryRepository(db)
    const service = new SaleFormatService(new SaleFormatRepository(db), categories)
    const refrescos = categories.getBySlug('refrescos')

    const created = service.create({
      code: 'jarra',
      name: 'Jarra',
      sortOrder: 60,
      requiresComplement: true,
      complementCategoryRootId: refrescos!.id,
    })

    expect(created.requiresComplement).toBe(1)
    expect(created.complementCategoryRootId).toBe(refrescos!.id)
  })

  it('rejects complement categories that are not root categories', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-formats-invalid-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const categories = new CategoryRepository(db)
    const service = new SaleFormatService(new SaleFormatRepository(db), categories)
    const ron = categories.getBySlug('ron')

    expect(() =>
      service.create({
        code: 'reserva',
        name: 'Reserva',
        sortOrder: 70,
        requiresComplement: true,
        complementCategoryRootId: ron!.id,
      }),
    ).toThrowError(/categoria de complemento debe ser una categoria raiz/i)
  })
})
