import type { InventoryBalanceRow, InventoryMovementInput } from '../types/inventory'
import type { InventoryLot, InventoryLotCreateInput, IngredientProgressiveConfigInput } from '../types/inventoryProgressive'

export const inventoryChannels = {
  listBalance: 'inventory:listBalance',
  postOpening: 'inventory:postOpening',
  postEntry: 'inventory:postEntry',
  postAdjustment: 'inventory:postAdjustment',
  listLots: 'inventory:listLots',
  createLots: 'inventory:createLots',
  updateIngredientProgressiveConfig: 'inventory:updateIngredientProgressiveConfig',
} as const

export interface InventoryApi {
  listBalance: () => Promise<InventoryBalanceRow[]>
  postOpening: (payload: InventoryMovementInput) => Promise<void>
  postEntry: (payload: InventoryMovementInput) => Promise<void>
  postAdjustment: (payload: InventoryMovementInput) => Promise<void>
  listLots: (productId: number) => Promise<InventoryLot[]>
  createLots: (payload: InventoryLotCreateInput) => Promise<void>
  updateIngredientProgressiveConfig: (payload: IngredientProgressiveConfigInput) => Promise<void>
}

