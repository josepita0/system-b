import type { CategoryTreeNode, SaleFormat } from './product'

export interface CreateSaleLineInput {
  productId: number
  quantity: number
  discount?: number
  saleFormatId?: number | null
  complementProductId?: number | null
}

export interface CreateSaleInput {
  items: CreateSaleLineInput[]
}

export interface SaleCreated {
  id: number
  total: number
  cashSessionId: number
  createdAt: string
}

export interface PosCatalogResponse {
  categoryTree: CategoryTreeNode[]
  saleFormats: SaleFormat[]
}
