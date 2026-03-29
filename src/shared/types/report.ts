export interface ReplenishmentItem {
  productId: number
  productName: string
  sku: string
  currentStock: number
  minStock: number
}

export interface ProductSalesTotal {
  productId: number
  productName: string
  quantity: number
  total: number
}

export interface ShiftCloseReport {
  sessionId: number
  businessDate: string
  shiftName: string
  inventory: Array<{
    ingredientId: number
    ingredientName: string
    stock: number
    minStock: number
  }>
  replenishment: ReplenishmentItem[]
  shiftCash: number
  /** Ventas con entrada de efectivo en la fecha (contado + liquidaciones de pagaré). */
  daySalesTotal: number
  /** Cargos a cuenta registrados en este turno aún no cobrados al momento del cierre. */
  shiftPendingReconcile: number
  productsSold: ProductSalesTotal[]
  pdfPath: string
}

export interface ReportJob {
  id: number
  sessionId: number
  recipientEmail: string
  pdfPath: string
  status: 'pending' | 'sent' | 'failed'
  lastError: string | null
  attempts: number
  createdAt: string
}
