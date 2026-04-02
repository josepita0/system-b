import { ipcMain } from 'electron'
import { inventoryChannels } from '../../shared/ipc/inventory'
import { getDb } from '../database/connection'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { ProductLotRepository } from '../repositories/productLotRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { InventoryService } from '../services/inventoryService'
import { ValidationError } from '../errors'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerInventoryHandlers() {
  const db = getDb()
  const service = new InventoryService(new ProductInventoryRepository(db), new ProductLotRepository(db))
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(inventoryChannels.listBalance, () =>
    executeIpc(() => {
      guards.requirePermission('inventory.view')
      const rows = service.listBalance() as Array<{
        product_id: number
        sku: string
        product_name: string
        min_stock: number
        stock: number
        consumption_mode: 'unit' | 'progressive'
        capacity_quantity: number | null
        capacity_unit: string | null
      }>
      return rows.map((row) => ({
        productId: row.product_id,
        sku: row.sku,
        productName: row.product_name,
        minStock: Number(row.min_stock),
        stock: Number(row.stock),
        consumptionMode: row.consumption_mode,
        capacityQuantity: row.capacity_quantity != null ? Number(row.capacity_quantity) : null,
        capacityUnit: row.capacity_unit,
      }))
    }),
  )

  ipcMain.handle(inventoryChannels.postOpening, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.manage')
      service.postOpening(payload as never)
    }),
  )

  ipcMain.handle(inventoryChannels.postEntry, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.manage')
      service.postEntry(payload as never)
    }),
  )

  ipcMain.handle(inventoryChannels.postAdjustment, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.manage')
      service.postAdjustment(payload as never)
    }),
  )

  ipcMain.handle(inventoryChannels.listLots, (_event, productId: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.view')
      if (typeof productId !== 'number' || Number.isNaN(productId)) {
        throw new ValidationError('Producto inválido.')
      }
      const rows = service.listLots(productId)
      return rows.map((r) => ({
        id: r.id,
        productId: r.product_id,
        status: r.status,
        capacityQuantity: Number(r.capacity_quantity),
        remainingQuantity: Number(r.remaining_quantity),
        openedAt: r.opened_at,
        depletedAt: r.depleted_at,
        createdAt: r.created_at,
      }))
    }),
  )

  ipcMain.handle(inventoryChannels.updateIngredientProgressiveConfig, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.manage')
      service.updateIngredientProgressiveConfig(payload as never)
    }),
  )

  ipcMain.handle(inventoryChannels.createLots, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.manage')
      service.createLots(payload as never)
    }),
  )
}

