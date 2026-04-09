import { ipcMain } from 'electron'
import { salesChannels } from '../../shared/ipc/sales'
import { getDb } from '../database/connection'
import { CategoryRepository } from '../repositories/categoryRepository'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { ProductRepository } from '../repositories/productRepository'
import { RecipeRepository } from '../repositories/recipeRepository'
import { SaleRepository } from '../repositories/saleRepository'
import { TabRepository } from '../repositories/tabRepository'
import { SaleFormatRepository } from '../repositories/saleFormatRepository'
import { ShiftRepository } from '../repositories/shiftRepository'
import { VipCustomerRepository } from '../repositories/vipCustomerRepository'
import { SaleFormatConsumptionRepository } from '../repositories/saleFormatConsumptionRepository'
import { BomRepository } from '../repositories/bomRepository'
import { ValidationError } from '../errors'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { CatalogMediaService } from '../services/catalogMediaService'
import { CategoryService } from '../services/categoryService'
import { SaleService } from '../services/saleService'
import { AuditLogRepository } from '../repositories/auditLogRepository'
import { BomService } from '../services/bomService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'
import type { OpenTabInput } from '../../shared/types/sale'

/** IPC puede enviar tipos sueltos; asegura el shape que valida `openTabSchema`. */
function normalizeOpenTabIpcPayload(payload: unknown): OpenTabInput {
  if (payload == null || typeof payload !== 'object') {
    return { customerName: '' }
  }
  const o = payload as Record<string, unknown>
  const customerName =
    typeof o.customerName === 'string' ? o.customerName.trim().slice(0, 200) : ''
  let vipCustomerId: number | undefined
  const raw = o.vipCustomerId
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    vipCustomerId = raw
  } else if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw.trim())
    if (Number.isInteger(n) && n > 0) {
      vipCustomerId = n
    }
  }
  if (vipCustomerId != null) {
    return { customerName, vipCustomerId }
  }
  return { customerName }
}

export function registerSaleHandlers() {
  const db = getDb()
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
  const audit = new AuditLogRepository(db)
  const bom = new BomService(new BomRepository(db), inventory)
  const saleService = new SaleService(
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
  )
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(salesChannels.posCatalog, () =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      return saleService.getPosCatalog()
    }),
  )

  ipcMain.handle(salesChannels.posProducts, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      if (!payload || typeof payload !== 'object') {
        throw new ValidationError('Parametros invalidos.')
      }
      const categoryId = Number((payload as any).categoryId)
      const search = typeof (payload as any).search === 'string' ? (payload as any).search : undefined
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        throw new ValidationError('Categoria invalida.')
      }
      return saleService.listPosProducts(categoryId, search)
    }),
  )

  ipcMain.handle(salesChannels.posInternalConsumptionProducts, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      if (!payload || typeof payload !== 'object') {
        throw new ValidationError('Parametros invalidos.')
      }
      const categoryId = Number((payload as any).categoryId)
      const search = typeof (payload as any).search === 'string' ? (payload as any).search : undefined
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        throw new ValidationError('Categoria invalida.')
      }
      return saleService.listPosInternalConsumptionProducts(categoryId, search)
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

  ipcMain.handle(salesChannels.openTab, (_event, payload: unknown) =>
    executeIpc(() => {
      const actor = guards.requirePermission('sales.use')
      return saleService.openTab(normalizeOpenTabIpcPayload(payload), actor.id)
    }),
  )

  ipcMain.handle(salesChannels.listOpenTabs, () =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      return saleService.listOpenTabs()
    }),
  )

  ipcMain.handle(salesChannels.settleTab, (_event, payload: unknown) =>
    executeIpc(() => {
      const actor = guards.requirePermission('sales.use')
      return saleService.settleTab(payload as never, actor.id)
    }),
  )

  ipcMain.handle(salesChannels.tabChargeDetail, (_event, tabId: unknown) =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      if (typeof tabId !== 'number' || Number.isNaN(tabId)) {
        throw new ValidationError('Cuenta invalida.')
      }
      return saleService.getTabChargeDetail(tabId)
    }),
  )

  ipcMain.handle(salesChannels.removeTabChargeLine, (_event, payload: unknown) =>
    executeIpc(() => {
      const actor = guards.requirePermission('sales.use')
      const result = saleService.removeTabChargeLine(payload as never)
      audit.create({
        actorEmployeeId: actor.id,
        action: 'tab.charge_line_removed',
        targetType: 'sale_item',
        targetId: payload && typeof payload === 'object' ? Number((payload as any).saleItemId) : null,
        details: payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null,
      })
      return result
    }),
  )

  ipcMain.handle(salesChannels.cancelEmptyTab, (_event, payload: unknown) =>
    executeIpc(() => {
      const actor = guards.requireRole('manager')
      const result = saleService.cancelEmptyTab(payload as never, actor.id)
      audit.create({
        actorEmployeeId: actor.id,
        action: 'tab.cancelled_empty',
        targetType: 'customer_tab',
        targetId: result.tabId,
        details: payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null,
      })
      return result
    }),
  )
}
