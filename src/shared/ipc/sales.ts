import type { Product } from '../types/product'
import type {
  CreateSaleInput,
  CustomerTabSummary,
  OpenTabInput,
  OpenTabResult,
  PosCatalogResponse,
  SaleCreated,
  SettleTabInput,
  TabSettlementResult,
} from '../types/sale'

export const salesChannels = {
  posCatalog: 'sales:posCatalog',
  posProducts: 'sales:posProducts',
  posComplementProducts: 'sales:posComplementProducts',
  create: 'sales:create',
  openTab: 'sales:openTab',
  listOpenTabs: 'sales:listOpenTabs',
  settleTab: 'sales:settleTab',
} as const

export interface SalesApi {
  posCatalog: () => Promise<PosCatalogResponse>
  posProducts: (categoryId: number) => Promise<Product[]>
  posComplementProducts: (rootCategoryId: number) => Promise<Product[]>
  create: (payload: CreateSaleInput) => Promise<SaleCreated>
  openTab: (payload: OpenTabInput) => Promise<OpenTabResult>
  listOpenTabs: () => Promise<CustomerTabSummary[]>
  settleTab: (payload: SettleTabInput) => Promise<TabSettlementResult>
}
