import type { CashSession, CloseShiftInput, OpenShiftInput, ShiftDefinition } from '../types/shift'

export const shiftChannels = {
  definitions: 'shifts:definitions',
  current: 'shifts:current',
  open: 'shifts:open',
  close: 'shifts:close',
} as const

export interface ShiftApi {
  definitions: () => Promise<ShiftDefinition[]>
  current: () => Promise<CashSession | null>
  open: (payload: OpenShiftInput) => Promise<CashSession>
  close: (payload: CloseShiftInput) => Promise<CashSession>
}
