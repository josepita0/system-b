import type { TabChargeDetail } from '@shared/types/sale'

/**
 * Evita "is not a function" cuando el preload de Electron no se recompiló tras un cambio de API.
 * Solución: detener la app y ejecutar `npm run build:main` o reiniciar `npm run dev` completo.
 */
function missingPreloadMessage(method: string) {
  return `API de ventas desactualizada (falta ${method}). Detenga la aplicacion, ejecute en la raiz del proyecto: npm run build:main — o reinicie npm run dev completo (main + renderer + electron).`
}

export function requireSalesTabChargeDetail(): (tabId: number) => Promise<TabChargeDetail> {
  const fn = window.api?.sales?.tabChargeDetail
  if (typeof fn === 'function') {
    return fn.bind(window.api.sales) as (tabId: number) => Promise<TabChargeDetail>
  }
  throw new Error(missingPreloadMessage('tabChargeDetail'))
}

export function requireSalesRemoveTabChargeLine(): (payload: { saleItemId: number }) => Promise<{
  tabId: number
  newBalance: number
}> {
  const fn = window.api?.sales?.removeTabChargeLine
  if (typeof fn === 'function') {
    return fn.bind(window.api.sales) as (payload: { saleItemId: number }) => Promise<{ tabId: number; newBalance: number }>
  }
  throw new Error(missingPreloadMessage('removeTabChargeLine'))
}
