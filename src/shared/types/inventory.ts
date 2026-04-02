export interface InventoryBalanceRow {
  productId: number
  sku: string
  productName: string
  minStock: number
  stock: number
  consumptionMode: 'unit' | 'progressive'
  capacityQuantity: number | null
  capacityUnit: string | null
}

export interface InventoryMovementInput {
  productId: number
  quantity: number
  note?: string | null
}

