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
  /** Si se indica, la venta es cargo a pagaré (no suma a caja de este turno). */
  tabId?: number
}

export interface CustomerTabSummary {
  id: number
  customerName: string
  openedAt: string
  balance: number
}

export interface OpenTabInput {
  customerName: string
}

export interface OpenTabResult {
  id: number
  customerName: string
  openedAt: string
}

export interface SettleTabInput {
  tabId: number
}

export interface TabSettlementResult {
  saleId: number
  total: number
  cashSessionId: number
  createdAt: string
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
