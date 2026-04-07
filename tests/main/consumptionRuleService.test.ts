import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { CategoryRepository } from '../../src/main/repositories/categoryRepository'
import { ConsumptionRuleRepository } from '../../src/main/repositories/consumptionRuleRepository'
import { ProductRepository } from '../../src/main/repositories/productRepository'
import { SaleFormatRepository } from '../../src/main/repositories/saleFormatRepository'
import { CatalogMediaService } from '../../src/main/services/catalogMediaService'
import { CategoryService } from '../../src/main/services/categoryService'
import { ConsumptionRuleService } from '../../src/main/services/consumptionRuleService'
import { ProductService } from '../../src/main/services/productService'
import type { CategoryTreeNode } from '../../src/shared/types/product'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

function sleepMs(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function rmDirWithRetries(dir: string) {
  const retries = 12
  for (let i = 0; i < retries; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
      return
    } catch (err: any) {
      const code = err?.code
      if (code === 'EBUSY' || code === 'EPERM') {
        sleepMs(50 * (i + 1))
        continue
      }
      throw err
    }
  }
  // En Windows, SQLite puede tardar en liberar handles; no bloqueamos el suite por cleanup.
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (err: any) {
    const code = err?.code
    if (code === 'EBUSY' || code === 'EPERM') {
      return
    }
    throw err
  }
}

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    const filePath = item.filePath
    rmDirWithRetries(path.dirname(filePath))
  }
})

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

function build(db: ReturnType<typeof createDatabase>) {
  const categories = new CategoryRepository(db)
  const saleFormats = new SaleFormatRepository(db)
  const products = new ProductRepository(db)
  const catalogMedia = new CatalogMediaService(categories, products)
  const categoryService = new CategoryService(categories, saleFormats, catalogMedia)
  const repository = new ConsumptionRuleRepository(db)
  const service = new ConsumptionRuleService(repository, products, categoryService)
  const productService = new ProductService(products, categories, catalogMedia)
  return { categories, categoryService, service, repository, productService }
}

describe('ConsumptionRuleService.syncProductRules', () => {
  it('rejects a sale format that does not apply to the product category', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-cons-sync-'))
    process.env.SYSTEM_BARRA_DATA_DIR = directory
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const { categories, categoryService, service, productService } = build(db)

    const ronId = categories.getBySlug('ron')!.id
    const product = productService.create({
      sku: 'RON-RULE-1',
      name: 'Ron test',
      type: 'simple',
      categoryId: ronId,
      salePrice: 10,
      minStock: 0,
    })

    expect(() =>
      service.syncProductRules({
        productId: product.id,
        rows: [{ saleFormatId: 99_999, consumeQuantity: 10, basePrice: null }],
      }),
    ).toThrow(/no aplican/i)
  })

  it('rejects duplicate sale format ids in one request', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-cons-dup-'))
    process.env.SYSTEM_BARRA_DATA_DIR = directory
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const { categories, categoryService, service, productService } = build(db)

    const ronId = categories.getBySlug('ron')!.id
    const tree = categoryService.listTree()
    const ronNode = findCategoryNode(tree, ronId)!
    const fmtId = ronNode.effectiveSaleFormatIds[0]

    const product = productService.create({
      sku: 'RON-RULE-2',
      name: 'Ron test 2',
      type: 'simple',
      categoryId: ronId,
      salePrice: 10,
      minStock: 0,
    })

    expect(() =>
      service.syncProductRules({
        productId: product.id,
        rows: [
          { saleFormatId: fmtId, consumeQuantity: 10, basePrice: null },
          { saleFormatId: fmtId, consumeQuantity: 20, basePrice: null },
        ],
      }),
    ).toThrow(/duplicados/i)
  })

  it('upserts rules and removes when consume is null', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-cons-upsert-'))
    process.env.SYSTEM_BARRA_DATA_DIR = directory
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const { categories, categoryService, service, repository, productService } = build(db)

    const ronId = categories.getBySlug('ron')!.id
    const tree = categoryService.listTree()
    const ronNode = findCategoryNode(tree, ronId)!
    const fmtA = ronNode.effectiveSaleFormatIds[0]
    const fmtB = ronNode.effectiveSaleFormatIds[1]

    const product = productService.create({
      sku: 'RON-RULE-3',
      name: 'Ron test 3',
      type: 'simple',
      categoryId: ronId,
      salePrice: 10,
      minStock: 0,
    })

    service.syncProductRules({
      productId: product.id,
      rows: [
        { saleFormatId: fmtA, consumeQuantity: 40, basePrice: 5.5 },
        { saleFormatId: fmtB, consumeQuantity: 50, basePrice: null },
      ],
    })

    const list = repository.list().filter((r) => r.productId === product.id)
    expect(list).toHaveLength(2)
    const a = list.find((r) => r.saleFormatId === fmtA)
    expect(a?.consumeQuantity).toBe(40)
    expect(a?.basePrice).toBe(5.5)
    expect(a?.unit).toBe('ml')

    service.syncProductRules({
      productId: product.id,
      rows: [
        { saleFormatId: fmtA, consumeQuantity: null, basePrice: null },
        { saleFormatId: fmtB, consumeQuantity: 60, basePrice: 2 },
      ],
    })

    const list2 = repository.list().filter((r) => r.productId === product.id)
    expect(list2).toHaveLength(1)
    expect(list2[0].saleFormatId).toBe(fmtB)
    expect(list2[0].consumeQuantity).toBe(60)
    expect(list2[0].basePrice).toBe(2)
  })
})
