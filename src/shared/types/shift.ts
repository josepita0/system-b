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
