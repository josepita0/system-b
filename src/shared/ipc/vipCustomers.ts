import type { PagedResult } from '../types/pagination'
import type { VipCustomer, VipCustomerInput } from '../types/vipCustomer'

export const vipCustomerChannels = {
  list: 'vipCustomers:list',
  listPaged: 'vipCustomers:listPaged',
  listActive: 'vipCustomers:listActive',
  getById: 'vipCustomers:getById',
  create: 'vipCustomers:create',
  update: 'vipCustomers:update',
  remove: 'vipCustomers:remove',
} as const

export interface VipCustomersApi {
  list: () => Promise<VipCustomer[]>
  listPaged: (params: unknown) => Promise<PagedResult<VipCustomer>>
  listActive: () => Promise<VipCustomer[]>
  getById: (id: number) => Promise<VipCustomer>
  create: (payload: VipCustomerInput) => Promise<VipCustomer>
  update: (payload: VipCustomerInput & { id: number }) => Promise<VipCustomer>
  remove: (id: number) => Promise<void>
}
