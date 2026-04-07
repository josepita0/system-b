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

/** Movimiento de inventario para auditoría (lista cronológica). */
export interface InventoryMovementHistoryRow {
  id: number
  productId: number
  productName: string
  sku: string
  movementType: 'entry' | 'exit' | 'adjustment' | 'sale'
  quantity: number
  referenceType: string
  referenceId: number | null
  note: string | null
  createdAt: string
}

