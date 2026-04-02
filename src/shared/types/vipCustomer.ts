export type VipCustomerConditionType = 'discount_manual' | 'exempt'

export interface VipCustomer {
  id: number
  name: string
  documentId: string | null
  phone: string | null
  notes: string | null
  conditionType: VipCustomerConditionType
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface VipCustomerInput {
  name: string
  documentId?: string | null
  phone?: string | null
  notes?: string | null
  conditionType: VipCustomerConditionType
  isActive?: boolean
}

