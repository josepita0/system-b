import type { SaleFormatConsumptionRule, SaleFormatConsumptionRuleInput } from '../types/consumptionRule'

export const consumptionChannels = {
  list: 'consumptions:list',
  create: 'consumptions:create',
  update: 'consumptions:update',
  remove: 'consumptions:remove',
} as const

export interface ConsumptionsApi {
  list: () => Promise<SaleFormatConsumptionRule[]>
  create: (payload: SaleFormatConsumptionRuleInput) => Promise<SaleFormatConsumptionRule>
  update: (payload: SaleFormatConsumptionRuleInput & { id: number }) => Promise<SaleFormatConsumptionRule>
  remove: (id: number) => Promise<void>
}

