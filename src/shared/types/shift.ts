export type ShiftCode = 'day' | 'night'

export interface ShiftDefinition {
  id: number
  code: ShiftCode
  name: string
  startTime: string
  endTime: string
  crossesMidnight: number
}

export interface CashSession {
  id: number
  shiftId: number
  businessDate: string
  openedAt: string
  closedAt: string | null
  openingCash: number
  expectedCash: number | null
  countedCash: number | null
  differenceCash: number | null
  status: 'open' | 'closed'
  /** Snapshot al cierre: cargos pagaré del turno aún no liquidados (cuentas abiertas). */
  pendingReconcileTotal: number | null
  /** Usuario que abrió el turno (employees.id); null en sesiones anteriores a la migración. */
  openedByUserId: number | null
  /** Solo sesión abierta actual (API current): totales en vivo para la barra de estado. */
  liveExpectedCash?: number | null
  livePendingReconcile?: number | null
}

export interface OpenShiftInput {
  shiftCode: ShiftCode
  businessDate: string
  openingCash: number
}

export interface CloseShiftInput {
  sessionId: number
  countedCash: number
}

/** Fila para listado de histórico de turnos. */
export interface CashSessionHistoryEntry {
  id: number
  shiftId: number
  shiftName: string
  businessDate: string
  openedAt: string
  closedAt: string | null
  openedByUserId: number | null
  openedByLabel: string | null
  openingCash: number
  expectedCash: number | null
  countedCash: number | null
  differenceCash: number | null
  pendingReconcileTotal: number | null
  status: 'open' | 'closed'
  /** Turno abierto: apertura + ventas con efectivo hasta ahora (control en curso). */
  liveExpectedCash?: number | null
  /** Turno abierto: cargos pagaré pendientes (cuentas abiertas). */
  livePendingReconcile?: number | null
}

export interface ShiftSessionSaleLineDetail {
  productName: string
  quantity: number
  subtotal: number
}

export interface ShiftSessionSaleDetail {
  id: number
  saleType: string
  total: number
  createdAt: string
  tabId: number | null
  /** Cliente de la cuenta (pagaré), si la venta está vinculada a `customer_tabs`. */
  tabCustomerName: string | null
  lines: ShiftSessionSaleLineDetail[]
}

export interface ShiftSessionTabDetail {
  id: number
  customerName: string
  status: string
  openedAt: string
  settledAt: string | null
  openedCashSessionId: number
  settledCashSessionId: number | null
  /** Si la cuenta se abrió en esta sesión. */
  openedHere: boolean
  /** Si la cuenta se liquidó en esta sesión. */
  settledHere: boolean
}

export interface ShiftSessionDetail {
  session: CashSessionHistoryEntry
  sales: ShiftSessionSaleDetail[]
  tabs: ShiftSessionTabDetail[]
}
