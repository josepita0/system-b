import { ipcMain } from 'electron'
import { consumptionChannels } from '../../shared/ipc/consumptions'
import { getDb } from '../database/connection'
import { CategoryRepository } from '../repositories/categoryRepository'
import { ConsumptionRuleRepository } from '../repositories/consumptionRuleRepository'
import { ProductRepository } from '../repositories/productRepository'
import { SaleFormatRepository } from '../repositories/saleFormatRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { CatalogMediaService } from '../services/catalogMediaService'
import { CategoryService } from '../services/categoryService'
import { ConsumptionRuleService } from '../services/consumptionRuleService'
import { ValidationError } from '../errors'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerConsumptionHandlers() {
  const db = getDb()
  const categories = new CategoryRepository(db)
  const saleFormats = new SaleFormatRepository(db)
  const products = new ProductRepository(db)
  const catalogMedia = new CatalogMediaService(categories, products)
  const categoryService = new CategoryService(categories, saleFormats, catalogMedia)
  const service = new ConsumptionRuleService(new ConsumptionRuleRepository(db), products, categoryService)
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(consumptionChannels.list, () =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return service.list()
    }),
  )

  ipcMain.handle(consumptionChannels.create, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return service.create(payload)
    }),
  )

  ipcMain.handle(consumptionChannels.update, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return service.update(payload)
    }),
  )

  ipcMain.handle(consumptionChannels.remove, (_event, id: unknown) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      if (typeof id !== 'number' || Number.isNaN(id)) {
        throw new ValidationError('Id inválido.')
      }
      service.remove(id)
    }),
  )

  ipcMain.handle(consumptionChannels.syncProductRules, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return service.syncProductRules(payload)
    }),
  )
}

