import type { CategoryTreeNode, SaleFormat } from './product'

export interface CreateSaleLineInput {
  productId: number
  quantity: number
  discount?: number
  saleFormatId?: number | null
  complementProductId?: number | null
  chargedUnitPrice?: number
  priceChangeNote?: string | null
}

export interface CreateSaleInput {
  items: CreateSaleLineInput[]
  /** Si se indica, la venta es cargo a pagaré (no suma a caja de este turno). */
  tabId?: number
  vipCustomerId?: number
  /** Si se indica, el total cobrado se fuerza a este monto (solo para ventas VIP manuales). */
  chargedTotal?: number
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
  /** `null` si se cerró la cuenta con saldo 0 sin cobro en efectivo. */
  saleId: number | null
  total: number
  cashSessionId: number
  createdAt: string
}

export interface TabChargeLineDetail {
  saleItemId: number
  saleId: number
  createdAt: string
  productName: string
  quantity: number
  subtotal: number
}

export interface TabChargeDetail {
  tabId: number
  customerName: string
  balance: number
  lines: TabChargeLineDetail[]
}

export interface RemoveTabChargeLineInput {
  saleItemId: number
}

export interface SaleCreated {
  id: number
  total: number
  realTotal?: number
  chargedTotal?: number
  cashSessionId: number
  createdAt: string
}

export interface PosCatalogResponse {
  categoryTree: CategoryTreeNode[]
  saleFormats: SaleFormat[]
}
