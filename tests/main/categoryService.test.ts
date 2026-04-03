import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { CategoryRepository } from '../../src/main/repositories/categoryRepository'
import { ProductRepository } from '../../src/main/repositories/productRepository'
import { SaleFormatRepository } from '../../src/main/repositories/saleFormatRepository'
import { CatalogMediaService } from '../../src/main/services/catalogMediaService'
import { CategoryService } from '../../src/main/services/categoryService'
import { ProductService } from '../../src/main/services/productService'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    fs.rmSync(path.dirname(item.filePath), { recursive: true, force: true })
  }
})

describe('CategoryService', () => {
  it('creates subcategories and assigns sale formats', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-categories-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const categories = new CategoryRepository(db)
    const saleFormats = new SaleFormatRepository(db)
    const products = new ProductRepository(db)
    const catalogMedia = new CatalogMediaService(categories, products)
    const service = new CategoryService(categories, saleFormats, catalogMedia)
    const licores = categories.getBySlug('licores')
    const combinado = saleFormats.getByCode('combinado')
    const licoresRow = service.listTree().find((category) => category.slug === 'licores')

    const created = service.create({
      name: 'Tequila',
      slug: 'tequila',
      parentId: licores!.id,
      supportsChildren: false,
      inheritsSaleFormats: true,
      sortOrder: 60,
    })

    const tree = service.listTree()
    const tequila = tree
      .flatMap((root) => [root, ...root.children])
      .find((category) => category.slug === 'tequila')

    expect(tequila?.parentId).toBe(licores!.id)
    expect(tequila?.inheritsSaleFormats).toBe(1)
    expect(tequila?.assignedSaleFormatIds).toEqual([])
    expect(tequila?.effectiveSaleFormatIds).toEqual(licoresRow?.effectiveSaleFormatIds)
    expect(tequila?.effectiveSaleFormatIds).toContain(combinado!.id)
    expect(tequila?.inheritedFromCategoryName).toBe('Licores')
  })

  it('locks a category when it becomes parent of another category', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-categories-lock-parent-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const categories = new CategoryRepository(db)
    const saleFormats = new SaleFormatRepository(db)
    const products = new ProductRepository(db)
    const catalogMedia = new CatalogMediaService(categories, products)
    const service = new CategoryService(categories, saleFormats, catalogMedia)

    const createdParent = service.create({
      name: 'Destilados',
      slug: 'destilados',
      parentId: null,
      supportsChildren: true,
      inheritsSaleFormats: false,
      sortOrder: 90,
    })

    expect(categories.getById(createdParent.id)?.structureLocked).toBe(0)

    service.create({
      name: 'Tequila',
      slug: 'tequila-anejo',
      parentId: createdParent.id,
      supportsChildren: false,
      inheritsSaleFormats: true,
      sortOrder: 10,
    })

    expect(categories.getById(createdParent.id)?.structureLocked).toBe(1)
  })

  it('prevents deactivating categories with active products', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-categories-products-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const categories = new CategoryRepository(db)
    const saleFormats = new SaleFormatRepository(db)
    const products = new ProductRepository(db)
    const catalogMedia = new CatalogMediaService(categories, products)
    const service = new CategoryService(categories, saleFormats, catalogMedia)
    const productService = new ProductService(products, categories, catalogMedia)
    const refrescos = categories.getBySlug('refrescos')

    productService.create({
      sku: 'SPRITE-001',
      name: 'Sprite',
      type: 'simple',
      categoryId: refrescos!.id,
      salePrice: 2,
      minStock: 1,
    })

    expect(() => service.remove(refrescos!.id)).toThrowError(/productos activos/i)
  })

  it('allows only categories marked as parent to receive children', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-categories-parent-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const categories = new CategoryRepository(db)
    const saleFormats = new SaleFormatRepository(db)
    const products = new ProductRepository(db)
    const catalogMedia = new CatalogMediaService(categories, products)
    const service = new CategoryService(categories, saleFormats, catalogMedia)
    const ron = categories.getBySlug('ron')

    expect(() =>
      service.create({
        name: 'Ron especiado',
        slug: 'ron-especiado',
        parentId: ron!.id,
        supportsChildren: false,
        inheritsSaleFormats: true,
        sortOrder: 10,
      }),
    ).toThrowError(/no admite subcategorias/i)
  })

  it('prevents editing own formats while category inherits and allows detaching later', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-categories-inherit-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const categories = new CategoryRepository(db)
    const saleFormats = new SaleFormatRepository(db)
    const products = new ProductRepository(db)
    const catalogMedia = new CatalogMediaService(categories, products)
    const service = new CategoryService(categories, saleFormats, catalogMedia)
    const ron = categories.getBySlug('ron')
    const combinado = saleFormats.getByCode('combinado')

    expect(() =>
      service.setEnabledSaleFormats({
        categoryId: ron!.id,
        saleFormatIds: [combinado!.id],
      }),
    ).toThrowError(/heredando formatos/i)

    service.update({
      id: ron!.id,
      name: ron!.name,
      slug: ron!.slug,
      parentId: ron!.parentId,
      supportsChildren: Boolean(ron!.supportsChildren),
      inheritsSaleFormats: false,
      sortOrder: ron!.sortOrder,
    })

    service.setEnabledSaleFormats({
      categoryId: ron!.id,
      saleFormatIds: [combinado!.id],
    })

    const ronTree = service
      .listTree()
      .flatMap((root) => [root, ...root.children])
      .find((category) => category.slug === 'ron')

    expect(ronTree?.inheritsSaleFormats).toBe(0)
    expect(ronTree?.assignedSaleFormatIds).toEqual([combinado!.id])
    expect(ronTree?.effectiveSaleFormatIds).toEqual([combinado!.id])
  })

  it('allows moving an unlocked category and blocks moving a locked one', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-categories-reparent-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const categories = new CategoryRepository(db)
    const saleFormats = new SaleFormatRepository(db)
    const products = new ProductRepository(db)
    const catalogMedia = new CatalogMediaService(categories, products)
    const service = new CategoryService(categories, saleFormats, catalogMedia)
    const productService = new ProductService(products, categories, catalogMedia)
    const licores = categories.getBySlug('licores')
    const cervezas = categories.getBySlug('cervezas')

    const category = service.create({
      name: 'Promociones',
      slug: 'promociones',
      parentId: null,
      supportsChildren: false,
      inheritsSaleFormats: false,
      sortOrder: 5,
    })

    const moved = service.update({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: licores!.id,
      supportsChildren: false,
      inheritsSaleFormats: true,
      sortOrder: category.sortOrder,
    })

    expect(moved.parentId).toBe(licores!.id)

    productService.create({
      sku: 'PROMO-001',
      name: 'Promo de bienvenida',
      type: 'simple',
      categoryId: category.id,
      salePrice: 1,
      minStock: 0,
    })

    expect(categories.getById(category.id)?.structureLocked).toBe(1)

    expect(() =>
      service.update({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: cervezas!.id,
        supportsChildren: false,
        inheritsSaleFormats: true,
        sortOrder: category.sortOrder,
      }),
    ).toThrowError(/bloqueada estructuralmente/i)
  })
})
