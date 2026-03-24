import type { SetupStatus } from '../types/setup'

export const setupChannels = {
  getStatus: 'setup:getStatus',
  complete: 'setup:complete',
} as const

export interface SetupApi {
  getStatus: () => Promise<SetupStatus>
  complete: () => Promise<{ success: true }>
}
