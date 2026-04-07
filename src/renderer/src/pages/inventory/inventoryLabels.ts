import type { InventoryBalanceRow } from '@shared/types/inventory'

/** Texto del saldo: enteros para lotes (progresivo), dos decimales para unitario. */
export function formatInventoryStockDisplay(row: Pick<InventoryBalanceRow, 'consumptionMode' | 'stock'>) {
  if (row.consumptionMode === 'progressive') {
    return String(Math.max(0, Math.round(Number(row.stock))))
  }
  return Number(row.stock).toFixed(2)
}

/**
 * Unidad mostrada junto al saldo en inventario.
 * Progresivo: el saldo es número de lotes con remanente; la unidad es "lotes" (el consumo por venta sigue en ml en reglas).
 */
export function stockDeductionUnitLabel(row: Pick<InventoryBalanceRow, 'consumptionMode' | 'capacityUnit'>) {
  if (row.consumptionMode === 'progressive') {
    return 'lotes'
  }
  return 'unidades'
}

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Salida',
  adjustment: 'Ajuste',
  sale: 'Venta',
}

export function movementTypeLabel(t: string) {
  return MOVEMENT_TYPE_LABEL[t] ?? t
}

/** Referencia legible para auditoría. */
export function referenceLabel(referenceType: string) {
  const map: Record<string, string> = {
    inventory_opening: 'Stock inicial',
    inventory_entry_manual: 'Entrada manual',
    inventory_adjustment: 'Ajuste manual',
    product_lots_entry: 'Unidades selladas (lotes)',
    sale: 'Venta',
    tab_charge_line_removal: 'Anulación línea cuenta',
  }
  return map[referenceType] ?? referenceType
}
