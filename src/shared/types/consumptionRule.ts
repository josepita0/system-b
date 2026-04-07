export interface SaleFormatConsumptionRule {
  id: number
  productId: number
  saleFormatId: number | null
  consumeQuantity: number
  unit: string
  /** Precio base por formato (opcional); el POS puede seguir usando `product.salePrice` si es null. */
  basePrice: number | null
  createdAt: string
}

export interface SaleFormatConsumptionRuleInput {
  productId: number
  saleFormatId?: number | null
  consumeQuantity: number
  unit?: string
  basePrice?: number | null
}

/** Sincroniza reglas por producto y formato (grilla masiva). */
export interface SyncProductConsumptionRulesInput {
  productId: number
  rows: Array<{
    saleFormatId: number
    /** Si es null o <= 0, se elimina la regla para ese formato si existía. */
    consumeQuantity: number | null
    basePrice?: number | null
  }>
}

