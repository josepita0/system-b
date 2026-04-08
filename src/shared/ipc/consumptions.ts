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
  applyTemplate3060All: 'consumptions:applyTemplate3060All',
} as const

export interface ConsumptionsApi {
  list: () => Promise<SaleFormatConsumptionRule[]>
  create: (payload: SaleFormatConsumptionRuleInput) => Promise<SaleFormatConsumptionRule>
  update: (payload: SaleFormatConsumptionRuleInput & { id: number }) => Promise<SaleFormatConsumptionRule>
  remove: (id: number) => Promise<void>
  syncProductRules: (payload: SyncProductConsumptionRulesInput) => Promise<{ success: true }>
  applyTemplate3060All: () => Promise<{ success: true; updatedProducts: number }>
}

