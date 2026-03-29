import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { ShiftStateError } from '../../src/main/errors'
import { CategoryRepository } from '../../src/main/repositories/categoryRepository'
import { InventoryRepository } from '../../src/main/repositories/inventoryRepository'
import { ProductRepository } from '../../src/main/repositories/productRepository'
import { RecipeRepository } from '../../src/main/repositories/recipeRepository'
import { SaleRepository } from '../../src/main/repositories/saleRepository'
import { TabRepository } from '../../src/main/repositories/tabRepository'
import { SaleFormatRepository } from '../../src/main/repositories/saleFormatRepository'
import { ShiftRepository } from '../../src/main/repositories/shiftRepository'
import { CategoryService } from '../../src/main/services/categoryService'
import { ProductService } from '../../src/main/services/productService'
import { SaleService } from '../../src/main/services/saleService'
import { ShiftService } from '../../src/main/services/shiftService'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    const filePath = item.filePath
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
  }
})

function buildSaleService(db: ReturnType<typeof createDatabase>) {
  const shifts = new ShiftRepository(db)
  const products = new ProductRepository(db)
  const saleFormats = new SaleFormatRepository(db)
  const categories = new CategoryRepository(db)
  const categoryService = new CategoryService(categories, saleFormats)
  const sales = new SaleRepository(db)
  const recipes = new RecipeRepository(db)
  const inventory = new InventoryRepository(db)
  const tabs = new TabRepository(db)
  return {
    saleService: new SaleService(
      shifts,
      products,
      saleFormats,
      categories,
      categoryService,
      sales,
      recipes,
      inventory,
      tabs,
    ),
    shifts,
    products,
    categories,
  }
}

describe('SaleService', () => {
  it('rejects checkout without an open cash session', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-no-session-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const { saleService, categories, products } = buildSaleService(db)
    const productService = new ProductService(products, categories)
    const refrescos = categories.getBySlug('refrescos')!
    const product = productService.create({
      sku: 'SALE-NS-1',
      name: 'Producto test',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 10,
      minStock: 0,
    })

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('T','U','employee',1)`).run()
        .lastInsertRowid,
    )

    expect(() =>
      saleService.createSale({ items: [{ productId: product.id, quantity: 1 }] }, empId),
    ).toThrow(ShiftStateError)
  })

  it('registers a sale against the open session', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-ok-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const shiftService = new ShiftService(new ShiftRepository(db))
    const openerId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('O','P','employee',1)`).run()
        .lastInsertRowid,
    )
    shiftService.open(
      {
        shiftCode: 'day',
        businessDate: '2026-03-20',
        openingCash: 0,
      },
      openerId,
    )

    const { saleService, categories, products } = buildSaleService(db)
    const productService = new ProductService(products, categories)
    const refrescos = categories.getBySlug('refrescos')!
    const product = productService.create({
      sku: 'SALE-OK-1',
      name: 'Agua',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 3.5,
      minStock: 0,
    })

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('T','U','employee',1)`).run()
        .lastInsertRowid,
    )

    const created = saleService.createSale({ items: [{ productId: product.id, quantity: 2 }] }, empId)

    expect(created.total).toBe(7)
    expect(created.cashSessionId).toBeGreaterThan(0)

    const row = db
      .prepare('SELECT COUNT(*) AS c FROM sale_items WHERE sale_id = ?')
      .get(created.id) as { c: number }
    expect(row.c).toBe(1)
  })

  it('tab charge does not increase cash session total; settlement does', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-tab-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const shiftService = new ShiftService(new ShiftRepository(db))
    const openerTab = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('O','T','employee',1)`).run()
        .lastInsertRowid,
    )
    shiftService.open(
      {
        shiftCode: 'day',
        businessDate: '2026-03-20',
        openingCash: 100,
      },
      openerTab,
    )

    const { saleService, categories, products, shifts } = buildSaleService(db)
    const productService = new ProductService(products, categories)
    const refrescos = categories.getBySlug('refrescos')!
    const product = productService.create({
      sku: 'SALE-TAB-1',
      name: 'Cerveza',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 5,
      minStock: 0,
    })

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('T','U','employee',1)`).run()
        .lastInsertRowid,
    )

    const session = shifts.getCurrentSession()!
    const tab = saleService.openTab({ customerName: 'Cliente Prueba' }, empId)

    saleService.createSale({ items: [{ productId: product.id, quantity: 2 }], tabId: tab.id }, empId)

    expect(shifts.getSalesTotalForSession(session.id)).toBe(0)

    const settled = saleService.settleTab({ tabId: tab.id }, empId)
    expect(settled.total).toBe(10)
    expect(shifts.getSalesTotalForSession(session.id)).toBe(10)
  })
})
