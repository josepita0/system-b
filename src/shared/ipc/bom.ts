import type { BomItem, BomStockVirtualRow, BomUpsertInput } from '../types/bom'

export const bomChannels = {
  getItems: 'bom:getItems',
  upsert: 'bom:upsert',
  removeAll: 'bom:removeAll',
  getVirtualStock: 'bom:getVirtualStock',
} as const

export interface BomApi {
  getItems: (parentProductId: number) => Promise<BomItem[]>
  upsert: (payload: BomUpsertInput) => Promise<void>
  removeAll: (parentProductId: number) => Promise<void>
  getVirtualStock: (parentProductId: number) => Promise<BomStockVirtualRow>
}

