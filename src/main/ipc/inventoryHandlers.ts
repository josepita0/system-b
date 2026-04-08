import { ipcMain } from 'electron'
import { parsePageParams, searchPagedInputSchema } from '../../shared/schemas/paginationSchema'
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

  ipcMain.handle(inventoryChannels.listMovementHistory, (_event, limit: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.view')
      const n = typeof limit === 'number' && Number.isFinite(limit) ? limit : 500
      const rows = service.listMovementHistory(n)
      return rows.map((row) => ({
        id: row.id,
        productId: row.product_id,
        sku: row.sku,
        productName: row.product_name,
        movementType: row.movement_type,
        quantity: Number(row.quantity),
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        note: row.note,
        createdAt: row.created_at,
      }))
    }),
  )

  ipcMain.handle(inventoryChannels.listMovementHistoryPaged, (_event, raw: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.view')
      const p = parsePageParams(raw ?? {})
      const result = service.listMovementHistoryPaged(p.page, p.pageSize)
      return {
        items: result.items.map((row) => ({
          id: row.id,
          productId: row.product_id,
          sku: row.sku,
          productName: row.product_name,
          movementType: row.movement_type,
          quantity: Number(row.quantity),
          referenceType: row.reference_type,
          referenceId: row.reference_id,
          note: row.note,
          createdAt: row.created_at,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      }
    }),
  )

  const mapBalanceRow = (row: {
    product_id: number
    sku: string
    product_name: string
    min_stock: number
    stock: number
    consumption_mode: 'unit' | 'progressive'
    capacity_quantity: number | null
    capacity_unit: string | null
  }) => ({
    productId: row.product_id,
    sku: row.sku,
    productName: row.product_name,
    minStock: Number(row.min_stock),
    stock: Number(row.stock),
    consumptionMode: row.consumption_mode,
    capacityQuantity: row.capacity_quantity != null ? Number(row.capacity_quantity) : null,
    capacityUnit: row.capacity_unit,
  })

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
      return rows.map(mapBalanceRow)
    }),
  )

  ipcMain.handle(inventoryChannels.balanceSummary, () =>
    executeIpc(() => {
      guards.requirePermission('inventory.view')
      return service.balanceSummary()
    }),
  )

  ipcMain.handle(inventoryChannels.listBalancePaged, (_event, raw: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.view')
      const p = searchPagedInputSchema.parse(raw ?? {})
      const categoryId = raw && typeof raw === 'object' ? Number((raw as any).categoryId) : undefined
      const result = service.listBalancePaged(p.page, p.pageSize, p.search, Number.isFinite(categoryId) ? categoryId : undefined)
      const rows = result.items as Array<{
        product_id: number
        sku: string
        product_name: string
        category_id?: number
        category_name?: string
        min_stock: number
        stock: number
        consumption_mode: 'unit' | 'progressive'
        capacity_quantity: number | null
        capacity_unit: string | null
      }>
      return {
        items: rows.map((row) => ({
          ...mapBalanceRow(row as any),
          categoryId: (row as any).category_id != null ? Number((row as any).category_id) : null,
          categoryName: (row as any).category_name ?? null,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      }
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

