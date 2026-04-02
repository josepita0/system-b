export interface InventoryLot {
  id: number
  productId: number
  status: 'sealed' | 'open' | 'depleted'
  capacityQuantity: number
  remainingQuantity: number
  openedAt: string | null
  depletedAt: string | null
  createdAt: string
}

export interface InventoryLotCreateInput {
  productId: number
  units: number
  note?: string | null
}

export interface IngredientProgressiveConfigInput {
  productId: number
  consumptionMode: 'unit' | 'progressive'
  capacityQuantity?: number | null
  capacityUnit?: string | null
}

