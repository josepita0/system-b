import type { InventoryMovementHistoryRow } from '@shared/types/inventory'

/**
 * Carga el historial de movimientos. Si falta el método en `window.api`, el proceso Electron
 * suele estar usando un preload antiguo (no se recarga al guardar; hay que cerrar la app y volver a ejecutar `npm run dev`).
 */
export async function fetchInventoryMovementHistory(limit = 800): Promise<InventoryMovementHistoryRow[]> {
  const fn = window.api?.inventory?.listMovementHistory
  if (typeof fn === 'function') {
    return fn(limit)
  }
  throw new Error(
    'El historial de inventario no está disponible: el preload de Electron está desactualizado. Cierre por completo la ventana de la aplicación y vuelva a ejecutar `npm run dev`, o ejecute `npm run build:main` y reinicie.',
  )
}
