import type {
  SaleFormatConsumptionRule,
  SaleFormatConsumptionRuleInput,
  SyncProductConsumptionRulesInput,
} from '../types/consumptionRule'

export const consumptionChannels = {
  list: 'consumptions:list',
  create: 'consumptions:create',
  update: 'consumptions:update',
  remove: 'consumptions:remove',
  syncProductRules: 'consumptions:syncProductRules',
} as const

export interface ConsumptionsApi {
  list: () => Promise<SaleFormatConsumptionRule[]>
  create: (payload: SaleFormatConsumptionRuleInput) => Promise<SaleFormatConsumptionRule>
  update: (payload: SaleFormatConsumptionRuleInput & { id: number }) => Promise<SaleFormatConsumptionRule>
  remove: (id: number) => Promise<void>
  syncProductRules: (payload: SyncProductConsumptionRulesInput) => Promise<{ success: true }>
}

