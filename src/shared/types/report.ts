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
  /** Nombre del cliente VIP en ventas de este producto, o "N/A". */
  vipCustomerLabel: string
}

/** Línea de consumo cargada a una cuenta (pagaré) abierta en el turno. */
export interface AccountOpenedConsumptionLine {
  productName: string
  quantity: number
  subtotal: number
}

/** Cuenta (pagaré) abierta durante el turno que se está cerrando. */
export interface AccountOpenedInShift {
  tabId: number
  customerName: string
  openedAt: string
  /** Detalle de productos cargados a la cuenta (ventas tab_charge) hasta el cierre. */
  consumptionLines: AccountOpenedConsumptionLine[]
  /** Saldo pendiente (suma de cargos a cuenta). */
  balanceTotal: number
}

export interface CancelledEmptyAccountInShift {
  tabId: number
  customerName: string
  cancelledAt: string
  cancelledByLabel: string
  reason: string
}

export interface ShiftCloseReport {
  sessionId: number
  businessDate: string
  shiftName: string
  closingNote?: string | null
  inventory: Array<{
    ingredientId: number
    ingredientName: string
    stock: number
    minStock: number
  }>
  replenishment: ReplenishmentItem[]
  shiftCash: number
  /** Efectivo al abrir la caja en este turno. */
  openingCash: number
  /** Ventas en efectivo de esta sesión (POS + pagos en mesa; mismo criterio que caja). */
  daySalesTotal: number
  /** Quien figura como responsable del cierre (empleado que abrió la sesión). */
  closedByLabel: string
  /** Código ISO de moneda para formateo (p. ej. EUR, VES, USD). */
  currencyCode: string
  /** Suma de saldos pendientes de cuentas pagaré abiertas (mismo criterio que «Por conciliar» al cerrar). */
  shiftPendingReconcile: number
  /** Fecha y hora del cierre de sesión (solo si el PDF se genera con la caja ya cerrada). */
  closureAtLabel?: string | null
  productsSold: ProductSalesTotal[]
  /** Cuentas pagaré abiertas con saldo pendiente (cualquier turno de apertura). */
  accountsPendingLiquidation: AccountOpenedInShift[]
  /** Cuentas canceladas (vacías) durante este turno, con motivo. */
  cancelledEmptyAccounts?: CancelledEmptyAccountInShift[]
  pdfPath: string
  /** Si el correo con PDF se envió en el acto por SMTP (sin depender de la cola). */
  emailSentImmediately?: boolean
  /** Si el envío quedó en cola (fallo SMTP o configuración incompleta). */
  emailEnqueued?: boolean
  /** Destinatario usado al enviar o encolar (settings o tabla legacy). */
  reportRecipientEmail?: string | null
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
