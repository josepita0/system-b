import type { PagedResult } from '../types/pagination'
import type {
  CancelInternalConsumptionInput,
  CreateInternalConsumptionInput,
  InternalConsumption,
  InternalConsumptionListItem,
} from '../types/internalConsumption'

export const internalConsumptionChannels = {
  create: 'internalConsumptions:create',
  getById: 'internalConsumptions:getById',
  listPaged: 'internalConsumptions:listPaged',
  cancel: 'internalConsumptions:cancel',
} as const

export interface InternalConsumptionsApi {
  create: (payload: CreateInternalConsumptionInput) => Promise<{ id: number }>
  getById: (id: number) => Promise<InternalConsumption>
  listPaged: (params: unknown) => Promise<PagedResult<InternalConsumptionListItem>>
  cancel: (payload: CancelInternalConsumptionInput) => Promise<void>
}

