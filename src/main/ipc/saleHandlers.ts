import { ipcMain } from 'electron'
import { salesChannels } from '../../shared/ipc/sales'
import { getDb } from '../database/connection'
import { CategoryRepository } from '../repositories/categoryRepository'
import { InventoryRepository } from '../repositories/inventoryRepository'
import { ProductRepository } from '../repositories/productRepository'
import { RecipeRepository } from '../repositories/recipeRepository'
import { SaleRepository } from '../repositories/saleRepository'
import { SaleFormatRepository } from '../repositories/saleFormatRepository'
import { ShiftRepository } from '../repositories/shiftRepository'
import { ValidationError } from '../errors'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { CategoryService } from '../services/categoryService'
import { SaleService } from '../services/saleService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerSaleHandlers() {
  const db = getDb()
  const shifts = new ShiftRepository(db)
  const products = new ProductRepository(db)
  const saleFormats = new SaleFormatRepository(db)
  const categories = new CategoryRepository(db)
  const categoryService = new CategoryService(categories, saleFormats)
  const sales = new SaleRepository(db)
  const recipes = new RecipeRepository(db)
  const inventory = new InventoryRepository(db)
  const saleService = new SaleService(
    shifts,
    products,
    saleFormats,
    categories,
    categoryService,
    sales,
    recipes,
    inventory,
  )
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(salesChannels.posCatalog, () =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      return saleService.getPosCatalog()
    }),
  )

  ipcMain.handle(salesChannels.posProducts, (_event, categoryId: number) =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      if (typeof categoryId !== 'number' || Number.isNaN(categoryId)) {
        throw new ValidationError('Categoria invalida.')
      }
      return saleService.listPosProducts(categoryId)
    }),
  )

  ipcMain.handle(salesChannels.posComplementProducts, (_event, rootCategoryId: number) =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      if (typeof rootCategoryId !== 'number' || Number.isNaN(rootCategoryId)) {
        throw new ValidationError('Categoria invalida.')
      }
      return saleService.listPosComplementProducts(rootCategoryId)
    }),
  )

  ipcMain.handle(salesChannels.create, (_event, payload: unknown) =>
    executeIpc(() => {
      const actor = guards.requirePermission('sales.use')
      return saleService.createSale(payload as never, actor.id)
    }),
  )
}
