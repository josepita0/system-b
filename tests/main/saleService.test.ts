import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { AuthorizationError, ShiftStateError } from '../../src/main/errors'
import { CategoryRepository } from '../../src/main/repositories/categoryRepository'
import { ProductInventoryRepository } from '../../src/main/repositories/productInventoryRepository'
import { ProductRepository } from '../../src/main/repositories/productRepository'
import { RecipeRepository } from '../../src/main/repositories/recipeRepository'
import { SaleRepository } from '../../src/main/repositories/saleRepository'
import { TabRepository } from '../../src/main/repositories/tabRepository'
import { SaleFormatRepository } from '../../src/main/repositories/saleFormatRepository'
import { ShiftRepository } from '../../src/main/repositories/shiftRepository'
import { VipCustomerRepository } from '../../src/main/repositories/vipCustomerRepository'
import { SaleFormatConsumptionRepository } from '../../src/main/repositories/saleFormatConsumptionRepository'
import { BomRepository } from '../../src/main/repositories/bomRepository'
import { CatalogMediaService } from '../../src/main/services/catalogMediaService'
import { BomService } from '../../src/main/services/bomService'
import { CategoryService } from '../../src/main/services/categoryService'
import { ProductService } from '../../src/main/services/productService'
import { SaleService } from '../../src/main/services/saleService'
import { ShiftService } from '../../src/main/services/shiftService'
import type { CategoryTreeNode } from '../../src/shared/types/product'

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
  const catalogMedia = new CatalogMediaService(categories, products)
  const categoryService = new CategoryService(categories, saleFormats, catalogMedia)
  const sales = new SaleRepository(db)
  const recipes = new RecipeRepository(db)
  const inventory = new ProductInventoryRepository(db)
  const tabs = new TabRepository(db)
  const vipCustomers = new VipCustomerRepository(db)
  const consumptions = new SaleFormatConsumptionRepository(db)
  const boms = new BomRepository(db)
  const bom = new BomService(boms, inventory)
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
      vipCustomers,
      consumptions,
      bom,
    ),
    shifts,
    products,
    categories,
    saleFormats,
    catalogMedia,
    vipCustomers,
  }
}

function findCategoryNode(nodes: CategoryTreeNode[], id: number): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    const child = findCategoryNode(node.children, id)
    if (child) {
      return child
    }
  }
  return null
}

describe('SaleService', () => {
  it('rejects checkout without an open cash session', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-no-session-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const { saleService, categories, products, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
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
      saleService.createSale({ items: [{ productId: product.id, quantity: 1 }] }, { id: empId, role: 'employee' }),
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

    const { saleService, categories, products, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
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

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(product.id, 100)

    const created = saleService.createSale(
      { items: [{ productId: product.id, quantity: 2 }] },
      { id: empId, role: 'employee' },
    )

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

    const { saleService, categories, products, shifts, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
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

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(product.id, 100)

    saleService.createSale(
      { items: [{ productId: product.id, quantity: 2 }], tabId: tab.id },
      { id: empId, role: 'employee' },
    )

    expect(shifts.getSalesTotalForSession(session.id)).toBe(0)

    const settled = saleService.settleTab({ tabId: tab.id }, empId)
    expect(settled.total).toBe(10)
    expect(shifts.getSalesTotalForSession(session.id)).toBe(10)
  })

  it('closing shift persists pending reconcile when a tab charge stays open', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-close-pending-'))
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
        businessDate: '2026-03-21',
        openingCash: 50,
      },
      openerTab,
    )

    const { saleService, categories, products, shifts, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
    const refrescos = categories.getBySlug('refrescos')!
    const product = productService.create({
      sku: 'SALE-PEND-1',
      name: 'Gaseosa',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 4,
      minStock: 0,
    })

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('T','U','employee',1)`).run()
        .lastInsertRowid,
    )

    const session = shifts.getCurrentSession()!
    const tab = saleService.openTab({ customerName: 'Cliente Cuenta' }, empId)

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(product.id, 100)

    saleService.createSale(
      { items: [{ productId: product.id, quantity: 3 }], tabId: tab.id },
      { id: empId, role: 'employee' },
    )

    const closed = shiftService.close({
      sessionId: session.id,
      countedCash: 50,
      closingNote: 'Cierre de prueba',
    })

    expect(closed.status).toBe('closed')
    expect(closed.pendingReconcileTotal).toBe(12)
    expect(shifts.getSalesTotalForSession(session.id)).toBe(0)
  })

  it('uses base price from consumption rule when the line has a format', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-base-price-'))
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
        businessDate: '2026-03-22',
        openingCash: 0,
      },
      openerId,
    )

    const { saleService, categories, products, saleFormats, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
    const ron = categories.getBySlug('ron')!

    const categoryService = new CategoryService(categories, saleFormats, catalogMedia)
    const tree = categoryService.listTree()
    const ronNode = findCategoryNode(tree, ron.id)!
    const fmtId = ronNode.effectiveSaleFormatIds[0]

    const product = productService.create({
      sku: 'SALE-BP-1',
      name: 'Cacique',
      type: 'simple',
      categoryId: ron.id,
      salePrice: 10,
      minStock: 0,
    })

    db.prepare(
      `INSERT INTO sale_format_product_consumptions (product_id, sale_format_id, consume_quantity, unit, base_price)
       VALUES (?, ?, ?, 'ml', ?)`,
    ).run(product.id, fmtId, 50, 2.25)

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('T','U','employee',1)`).run()
        .lastInsertRowid,
    )

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(product.id, 100)

    const created = saleService.createSale(
      { items: [{ productId: product.id, quantity: 1, saleFormatId: fmtId }] },
      { id: empId, role: 'employee' },
    )
    expect(created.total).toBe(2.25)

    const item = db
      .prepare('SELECT unit_price, real_unit_price, charged_unit_price, sale_format_id FROM sale_items WHERE sale_id = ?')
      .get(created.id) as { unit_price: number; real_unit_price: number; charged_unit_price: number; sale_format_id: number | null }
    expect(item.sale_format_id).toBe(fmtId)
    expect(Number(item.unit_price)).toBeCloseTo(2.25)
    expect(Number(item.real_unit_price)).toBeCloseTo(2.25)
    expect(Number(item.charged_unit_price)).toBeCloseTo(2.25)
  })

  it('creates a second sale item for complements and sums totals', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-complement-'))
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
        businessDate: '2026-03-22',
        openingCash: 0,
      },
      openerId,
    )

    const { saleService, categories, products, saleFormats, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
    const refrescos = categories.getBySlug('refrescos')!
    const ron = categories.getBySlug('ron')!

    const categoryService = new CategoryService(categories, saleFormats, catalogMedia)
    const tree = categoryService.listTree()
    const ronNode = findCategoryNode(tree, ron.id)!
    const fmtId = ronNode.effectiveSaleFormatIds[0]

    // El formato debe requerir complemento en la categoría "refrescos".
    const existingFormat = saleFormats.getById(fmtId)!
    saleFormats.update({
      id: existingFormat.id,
      code: existingFormat.code,
      name: existingFormat.name,
      sortOrder: existingFormat.sortOrder,
      requiresComplement: true,
      complementCategoryRootId: refrescos.id,
    })

    const base = productService.create({
      sku: 'SALE-COMP-BASE',
      name: 'Cacique',
      type: 'simple',
      categoryId: ron.id,
      salePrice: 10,
      minStock: 0,
    })
    const coke = productService.create({
      sku: 'SALE-COMP-COKE',
      name: 'Coca-cola',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 1,
      minStock: 0,
    })

    db.prepare(
      `INSERT INTO sale_format_product_consumptions (product_id, sale_format_id, consume_quantity, unit, base_price)
       VALUES (?, ?, ?, 'ml', ?)`,
    ).run(base.id, fmtId, 50, 2.25)

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('T','U','employee',1)`).run()
        .lastInsertRowid,
    )

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(base.id, 100)
    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(coke.id, 100)

    const created = saleService.createSale(
      {
        items: [{ productId: base.id, quantity: 1, saleFormatId: fmtId, complementProductId: coke.id }],
      },
      { id: empId, role: 'employee' },
    )

    expect(created.total).toBe(3.25)

    const items = db
      .prepare(
        'SELECT product_id, unit_price, sale_format_id, complement_product_id FROM sale_items WHERE sale_id = ? ORDER BY id ASC',
      )
      .all(created.id) as Array<{
      product_id: number
      unit_price: number
      sale_format_id: number | null
      complement_product_id: number | null
    }>
    expect(items).toHaveLength(1)
    expect(items[0].product_id).toBe(base.id)
    expect(items[0].sale_format_id).toBe(fmtId)
    expect(items[0].complement_product_id).toBe(coke.id)
    expect(Number(items[0].unit_price)).toBeCloseTo(3.25)
  })

  it('uses complement_sale_price for the complement when set instead of sale_price', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-complement-price-'))
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
        businessDate: '2026-03-22',
        openingCash: 0,
      },
      openerId,
    )

    const { saleService, categories, products, saleFormats, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
    const refrescos = categories.getBySlug('refrescos')!
    const ron = categories.getBySlug('ron')!

    const categoryService = new CategoryService(categories, saleFormats, catalogMedia)
    const tree = categoryService.listTree()
    const ronNode = findCategoryNode(tree, ron.id)!
    const fmtId = ronNode.effectiveSaleFormatIds[0]

    const existingFormat = saleFormats.getById(fmtId)!
    saleFormats.update({
      id: existingFormat.id,
      code: existingFormat.code,
      name: existingFormat.name,
      sortOrder: existingFormat.sortOrder,
      requiresComplement: true,
      complementCategoryRootId: refrescos.id,
    })

    const base = productService.create({
      sku: 'SALE-COMP-BASE-CP',
      name: 'Cacique',
      type: 'simple',
      categoryId: ron.id,
      salePrice: 10,
      minStock: 0,
    })
    const coke = productService.create({
      sku: 'SALE-COMP-COKE-CP',
      name: 'Coca-cola',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 1,
      minStock: 0,
    })

    db.prepare('UPDATE products SET complement_sale_price = ? WHERE id = ?').run(2, coke.id)

    db.prepare(
      `INSERT INTO sale_format_product_consumptions (product_id, sale_format_id, consume_quantity, unit, base_price)
       VALUES (?, ?, ?, 'ml', ?)`,
    ).run(base.id, fmtId, 50, 2.25)

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('T','U','employee',1)`).run()
        .lastInsertRowid,
    )

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(base.id, 100)
    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(coke.id, 100)

    const created = saleService.createSale(
      {
        items: [{ productId: base.id, quantity: 1, saleFormatId: fmtId, complementProductId: coke.id }],
      },
      { id: empId, role: 'employee' },
    )

    expect(created.total).toBe(4.25)

    const items = db
      .prepare(
        'SELECT product_id, unit_price, sale_format_id, complement_product_id FROM sale_items WHERE sale_id = ? ORDER BY id ASC',
      )
      .all(created.id) as Array<{
      product_id: number
      unit_price: number
      sale_format_id: number | null
      complement_product_id: number | null
    }>
    expect(items).toHaveLength(1)
    expect(Number(items[0].unit_price)).toBeCloseTo(4.25)
  })

  it('rejects non-VIP price change for employee', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-price-guard-employee-'))
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
        businessDate: '2026-03-23',
        openingCash: 0,
      },
      openerId,
    )

    const { saleService, categories, products, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
    const refrescos = categories.getBySlug('refrescos')!
    const product = productService.create({
      sku: 'SALE-PRICE-GUARD-EMP',
      name: 'Agua con cambio',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 10,
      minStock: 0,
    })

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('E','M','employee',1)`).run()
        .lastInsertRowid,
    )

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(product.id, 100)

    expect(() =>
      saleService.createSale(
        { items: [{ productId: product.id, quantity: 1, chargedUnitPrice: 9, priceChangeNote: 'promo' }] },
        { id: empId, role: 'employee' },
      ),
    ).toThrow(AuthorizationError)
  })

  it('allows non-VIP price change for manager/admin (with note)', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-price-guard-manager-'))
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
        businessDate: '2026-03-23',
        openingCash: 0,
      },
      openerId,
    )

    const { saleService, categories, products, catalogMedia } = buildSaleService(db)
    const productService = new ProductService(products, categories, catalogMedia)
    const refrescos = categories.getBySlug('refrescos')!
    const product = productService.create({
      sku: 'SALE-PRICE-GUARD-MGR',
      name: 'Agua con cambio manager',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 10,
      minStock: 0,
    })

    const managerId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('M','G','manager',1)`).run()
        .lastInsertRowid,
    )

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(product.id, 100)

    const created = saleService.createSale(
      { items: [{ productId: product.id, quantity: 1, chargedUnitPrice: 9, priceChangeNote: 'promo' }] },
      { id: managerId, role: 'manager' },
    )
    expect(created.total).toBe(9)
  })

  it('allows VIP price change even for employee', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-sale-price-guard-vip-'))
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
        businessDate: '2026-03-23',
        openingCash: 0,
      },
      openerId,
    )

    const { saleService, categories, products, catalogMedia, vipCustomers } = buildSaleService(db)
    const vip = vipCustomers.create({ name: 'VIP Test', conditionType: 'discount_manual' })

    const productService = new ProductService(products, categories, catalogMedia)
    const refrescos = categories.getBySlug('refrescos')!
    const product = productService.create({
      sku: 'SALE-PRICE-GUARD-VIP',
      name: 'Agua VIP con cambio',
      type: 'simple',
      categoryId: refrescos.id,
      salePrice: 10,
      minStock: 0,
    })

    const empId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('E','V','employee',1)`).run()
        .lastInsertRowid,
    )

    db.prepare(
      `INSERT INTO product_inventory_movements (product_id, movement_type, quantity, reference_type, note)
       VALUES (?, 'entry', ?, 'test', 'seed')`,
    ).run(product.id, 100)

    const created = saleService.createSale(
      { items: [{ productId: product.id, quantity: 1, chargedUnitPrice: 9 }], vipCustomerId: vip.id },
      { id: empId, role: 'employee' },
    )
    expect(created.total).toBe(9)
  })
})
