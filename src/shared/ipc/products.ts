import type { Product, ProductInput, ProductUpdateInput } from '../types/product'

export const productChannels = {
  list: 'products:list',
  getById: 'products:getById',
  create: 'products:create',
  update: 'products:update',
  remove: 'products:remove',
} as const

export interface ProductApi {
  list: () => Promise<Product[]>
  getById: (id: number) => Promise<Product | null>
  create: (payload: ProductInput) => Promise<Product>
  update: (payload: ProductUpdateInput) => Promise<Product>
  remove: (id: number) => Promise<{ success: true }>
}
