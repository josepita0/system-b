export type InternalConsumptionStatus = 'active' | 'cancelled'

export type InternalConsumptionLineInput = {
  productId: number
  quantity: number
  note?: string | null
}

export type CreateInternalConsumptionInput = {
  reason: string
  /** Si hay turno abierto, se asocia a la sesión actual para reporting. */
  attachToCurrentCashSession?: boolean
  items: InternalConsumptionLineInput[]
}

export type CancelInternalConsumptionInput = {
  id: number
  reason: string
}

export type InternalConsumptionItem = {
  id: number
  productId: number
  productName: string
  sku: string
  quantity: number
  note: string | null
}

export type InternalConsumption = {
  id: number
  cashSessionId: number | null
  createdByEmployeeId: number | null
  reason: string
  status: InternalConsumptionStatus
  cancelledAt: string | null
  cancelledByEmployeeId: number | null
  cancelReason: string | null
  createdAt: string
  items: InternalConsumptionItem[]
}

export type InternalConsumptionListItem = Omit<InternalConsumption, 'items'>

