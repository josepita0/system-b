import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { ProductRepository } from '../../src/main/repositories/productRepository'
import { ProductService } from '../../src/main/services/productService'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    const filePath = item.filePath
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
  }
})

describe('ProductService', () => {
  it('creates, updates and soft deletes products', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-products-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const service = new ProductService(new ProductRepository(db))

    const created = service.create({
      sku: 'COCA-001',
      name: 'Coca Cola',
      type: 'simple',
      salePrice: 2.5,
      minStock: 5,
    })

    expect(created.id).toBeGreaterThan(0)
    expect(service.list()).toHaveLength(1)

    const updated = service.update({
      id: created.id,
      sku: 'COCA-001',
      name: 'Coca Cola Zero',
      type: 'simple',
      salePrice: 3,
      minStock: 4,
    })

    expect(updated.name).toBe('Coca Cola Zero')

    service.remove(created.id)
    expect(service.list()).toHaveLength(0)
  })

  it('rejects duplicate sku', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-products-dup-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const service = new ProductService(new ProductRepository(db))

    service.create({
      sku: 'CAFE-001',
      name: 'Cafe',
      type: 'simple',
      salePrice: 1.5,
      minStock: 3,
    })

    expect(() =>
      service.create({
        sku: 'CAFE-001',
        name: 'Cafe Doble',
        type: 'simple',
        salePrice: 2,
        minStock: 2,
      }),
    ).toThrowError(/SKU/)
  })
})
