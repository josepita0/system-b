import { ipcMain } from 'electron'
import { productChannels } from '../../shared/ipc/products'
import { getDb } from '../database/connection'
import { CategoryRepository } from '../repositories/categoryRepository'
import { ProductRepository } from '../repositories/productRepository'
import { SaleFormatRepository } from '../repositories/saleFormatRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { CategoryService } from '../services/categoryService'
import { ProductService } from '../services/productService'
import { SaleFormatService } from '../services/saleFormatService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerProductHandlers() {
  const db = getDb()
  const categories = new CategoryRepository(db)
  const saleFormats = new SaleFormatRepository(db)
  const productService = new ProductService(new ProductRepository(db), categories)
  const categoryService = new CategoryService(categories, saleFormats)
  const saleFormatService = new SaleFormatService(saleFormats, categories)
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(productChannels.list, (_event, categoryId?: number) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return productService.list(categoryId)
    }),
  )
  ipcMain.handle(productChannels.getById, (_event, id: number) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return productService.getById(id)
    }),
  )
  ipcMain.handle(productChannels.create, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return productService.create(payload)
    }),
  )
  ipcMain.handle(productChannels.update, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return productService.update(payload)
    }),
  )
  ipcMain.handle(productChannels.remove, (_event, id: number) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return productService.remove(id)
    }),
  )
  ipcMain.handle(productChannels.listCategories, () =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return categoryService.listTree()
    }),
  )
  ipcMain.handle(productChannels.createCategory, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return categoryService.create(payload)
    }),
  )
  ipcMain.handle(productChannels.updateCategory, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return categoryService.update(payload)
    }),
  )
  ipcMain.handle(productChannels.removeCategory, (_event, id: number) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return categoryService.remove(id)
    }),
  )
  ipcMain.handle(productChannels.listSaleFormats, () =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return saleFormatService.list()
    }),
  )
  ipcMain.handle(productChannels.createSaleFormat, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return saleFormatService.create(payload)
    }),
  )
  ipcMain.handle(productChannels.updateSaleFormat, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return saleFormatService.update(payload)
    }),
  )
  ipcMain.handle(productChannels.removeSaleFormat, (_event, id: number) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return saleFormatService.remove(id)
    }),
  )
  ipcMain.handle(productChannels.setCategorySaleFormats, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return categoryService.setEnabledSaleFormats(payload)
    }),
  )
}
