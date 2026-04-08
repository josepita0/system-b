export type BomItemInput = {
  componentProductId: number
  quantityPerUnit: number
}

export type BomUpsertInput = {
  parentProductId: number
  items: BomItemInput[]
}

export type BomItem = {
  id: number
  parentProductId: number
  componentProductId: number
  componentSku: string
  componentName: string
  quantityPerUnit: number
}

export type BomStockVirtualRow = {
  parentProductId: number
  availableUnits: number
  limitingComponentProductId: number | null
}

