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
import { executeIpc } from './response'

export function registerProductHandlers() {
  const db = getDb()
  const categories = new CategoryRepository(db)
  const saleFormats = new SaleFormatRepository(db)
  const productService = new ProductService(new ProductRepository(db), categories)
  const categoryService = new CategoryService(categories, saleFormats)
  const saleFormatService = new SaleFormatService(saleFormats, categories)
  const auth = new AuthService(db)
  const authorization = new AuthorizationService()
  const requireManageProducts = () => {
    const user = auth.requireCurrentUser()
    authorization.requirePermission(user.permissions, 'products.manage')
    return user
  }

  ipcMain.handle(productChannels.list, (_event, categoryId?: number) =>
    executeIpc(() => {
      requireManageProducts()
      return productService.list(categoryId)
    }),
  )
  ipcMain.handle(productChannels.getById, (_event, id: number) =>
    executeIpc(() => {
      requireManageProducts()
      return productService.getById(id)
    }),
  )
  ipcMain.handle(productChannels.create, (_event, payload) =>
    executeIpc(() => {
      requireManageProducts()
      return productService.create(payload)
    }),
  )
  ipcMain.handle(productChannels.update, (_event, payload) =>
    executeIpc(() => {
      requireManageProducts()
      return productService.update(payload)
    }),
  )
  ipcMain.handle(productChannels.remove, (_event, id: number) =>
    executeIpc(() => {
      requireManageProducts()
      return productService.remove(id)
    }),
  )
  ipcMain.handle(productChannels.listCategories, () =>
    executeIpc(() => {
      requireManageProducts()
      return categoryService.listTree()
    }),
  )
  ipcMain.handle(productChannels.createCategory, (_event, payload) =>
    executeIpc(() => {
      requireManageProducts()
      return categoryService.create(payload)
    }),
  )
  ipcMain.handle(productChannels.updateCategory, (_event, payload) =>
    executeIpc(() => {
      requireManageProducts()
      return categoryService.update(payload)
    }),
  )
  ipcMain.handle(productChannels.removeCategory, (_event, id: number) =>
    executeIpc(() => {
      requireManageProducts()
      return categoryService.remove(id)
    }),
  )
  ipcMain.handle(productChannels.listSaleFormats, () =>
    executeIpc(() => {
      requireManageProducts()
      return saleFormatService.list()
    }),
  )
  ipcMain.handle(productChannels.createSaleFormat, (_event, payload) =>
    executeIpc(() => {
      requireManageProducts()
      return saleFormatService.create(payload)
    }),
  )
  ipcMain.handle(productChannels.updateSaleFormat, (_event, payload) =>
    executeIpc(() => {
      requireManageProducts()
      return saleFormatService.update(payload)
    }),
  )
  ipcMain.handle(productChannels.removeSaleFormat, (_event, id: number) =>
    executeIpc(() => {
      requireManageProducts()
      return saleFormatService.remove(id)
    }),
  )
  ipcMain.handle(productChannels.setCategorySaleFormats, (_event, payload) =>
    executeIpc(() => {
      requireManageProducts()
      return categoryService.setEnabledSaleFormats(payload)
    }),
  )
}
