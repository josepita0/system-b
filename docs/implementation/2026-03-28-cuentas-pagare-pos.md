# Cuentas pagaré y por conciliar (marzo 2026)

## Objetivo

Permitir ventas a cuenta con nombre de cliente, cargo a pagaré sin sumar a la caja del turno de consumo, liquidación en efectivo en un turno posterior, y snapshot de "por conciliar" al cerrar turno.

## Cambios

- **Migración `0018_customer_tabs_payables.sql`**: tabla `customer_tabs`, columna `sales.tab_id`, `cash_sessions.pending_reconcile_total`.
- **Tipos de venta**: `pos` (contado), `tab_charge` (consumo a cuenta), `tab_payment` (cobro que liquida).
- **Caja**: `getSalesTotalForSession` suma solo `pos` + `tab_payment`; al cerrar se guarda `pending_reconcile_total` (cargos `tab_charge` del turno con cuenta aún abierta).
- **IPC**: `sales.openTab`, `sales.listOpenTabs`, `sales.settleTab`; `create` admite `tabId` opcional.
- **PDF cierre**: líneas de ventas efectivo del día y por conciliar del turno.

## Archivos clave

- `src/main/repositories/tabRepository.ts`
- `src/main/repositories/saleRepository.ts` — `settleTabWithPayment`
- `src/main/services/saleService.ts`
- `src/main/repositories/shiftRepository.ts`
- `src/renderer/src/pages/sales/SalesPage.tsx`
