import type { PagedResult } from '../types/pagination'
import type { InventoryBalanceRow, InventoryMovementHistoryRow, InventoryMovementInput } from '../types/inventory'
import type { InventoryLot, InventoryLotCreateInput, IngredientProgressiveConfigInput } from '../types/inventoryProgressive'

export const inventoryChannels = {
  listBalance: 'inventory:listBalance',
  balanceSummary: 'inventory:balanceSummary',
  listBalancePaged: 'inventory:listBalancePaged',
  listMovementHistory: 'inventory:listMovementHistory',
  listMovementHistoryPaged: 'inventory:listMovementHistoryPaged',
  postOpening: 'inventory:postOpening',
  postEntry: 'inventory:postEntry',
  postAdjustment: 'inventory:postAdjustment',
  listLots: 'inventory:listLots',
  createLots: 'inventory:createLots',
  updateIngredientProgressiveConfig: 'inventory:updateIngredientProgressiveConfig',
} as const

export interface InventoryApi {
  listBalance: () => Promise<InventoryBalanceRow[]>
  balanceSummary: () => Promise<{ totalProducts: number; lowStockCount: number }>
  listBalancePaged: (params: unknown) => Promise<PagedResult<InventoryBalanceRow>>
  listMovementHistory: (limit?: number) => Promise<InventoryMovementHistoryRow[]>
  listMovementHistoryPaged: (params: unknown) => Promise<PagedResult<InventoryMovementHistoryRow>>
  postOpening: (payload: InventoryMovementInput) => Promise<void>
  postEntry: (payload: InventoryMovementInput) => Promise<void>
  postAdjustment: (payload: InventoryMovementInput) => Promise<void>
  listLots: (productId: number) => Promise<InventoryLot[]>
  createLots: (payload: InventoryLotCreateInput) => Promise<void>
  updateIngredientProgressiveConfig: (payload: IngredientProgressiveConfigInput) => Promise<void>
}
