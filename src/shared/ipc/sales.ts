import type { Product } from '../types/product'
import type { CreateSaleInput, PosCatalogResponse, SaleCreated } from '../types/sale'

export const salesChannels = {
  posCatalog: 'sales:posCatalog',
  posProducts: 'sales:posProducts',
  posComplementProducts: 'sales:posComplementProducts',
  create: 'sales:create',
} as const

export interface SalesApi {
  posCatalog: () => Promise<PosCatalogResponse>
  posProducts: (categoryId: number) => Promise<Product[]>
  posComplementProducts: (rootCategoryId: number) => Promise<Product[]>
  create: (payload: CreateSaleInput) => Promise<SaleCreated>
}
