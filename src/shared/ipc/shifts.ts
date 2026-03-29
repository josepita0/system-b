import type {
  CashSession,
  CashSessionHistoryEntry,
  CloseShiftInput,
  OpenShiftInput,
  ShiftDefinition,
  ShiftSessionDetail,
} from '../types/shift'

export const shiftChannels = {
  definitions: 'shifts:definitions',
  current: 'shifts:current',
  open: 'shifts:open',
  close: 'shifts:close',
  listHistory: 'shifts:listHistory',
  getSessionDetail: 'shifts:getSessionDetail',
} as const

export interface ShiftApi {
  definitions: () => Promise<ShiftDefinition[]>
  current: () => Promise<CashSession | null>
  open: (payload: OpenShiftInput) => Promise<CashSession>
  close: (payload: CloseShiftInput) => Promise<CashSession>
  listHistory: () => Promise<CashSessionHistoryEntry[]>
  getSessionDetail: (sessionId: number) => Promise<ShiftSessionDetail>
}
