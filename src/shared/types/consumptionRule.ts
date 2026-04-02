export interface SaleFormatConsumptionRule {
  id: number
  productId: number
  saleFormatId: number | null
  consumeQuantity: number
  unit: string
  createdAt: string
}

export interface SaleFormatConsumptionRuleInput {
  productId: number
  saleFormatId?: number | null
  consumeQuantity: number
  unit?: string
}

