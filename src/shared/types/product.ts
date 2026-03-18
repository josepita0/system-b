export type ProductType = 'simple' | 'compound'

export interface Product {
  id: number
  sku: string
  name: string
  type: ProductType
  salePrice: number
  minStock: number
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface ProductInput {
  sku: string
  name: string
  type: ProductType
  salePrice: number
  minStock: number
}

export interface ProductUpdateInput extends ProductInput {
  id: number
}
