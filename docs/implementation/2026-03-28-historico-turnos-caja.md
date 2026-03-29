# Historico de turnos y caja (marzo 2026)

## Objetivo

Listado de sesiones cerradas con quien aperturo, montos de cierre y por conciliar; detalle de ventas y cuentas pagaré. Reglas de visibilidad para empleados vs gerencia.

## Cambios

- **Migración `0019_cash_sessions_opened_by_user.sql`**: `opened_by_user_id` (FK a `employees`).
- **Apertura de turno**: IPC pasa el usuario autenticado; se persiste en la sesión.
- **ShiftRepository**: consultas de histórico, última sesión cerrada global, elegibilidad empleado (`pending_reconcile_total = 0`, sin `customer_tabs` abiertas originadas en el turno), detalle de ventas y tabs. `getHistoryEntryById` calcula `liveExpectedCash` y `livePendingReconcile` para turnos **abiertos**.
- **ShiftService**: `listHistory` antepone la sesión abierta actual; `getSessionDetail` permite a empleados ver solo el turno abierto **actual** (no otros abiertos).
- **IPC**: `shifts:listHistory`, `shifts:getSessionDetail`.
- **UI**: tabla en `ShiftsPage` (columna Estado, totales en vivo en curso) y modal de detalle.

## Archivos clave

- `src/main/repositories/shiftRepository.ts`
- `src/main/services/shiftService.ts`
- `src/main/ipc/shiftHandlers.ts`
- `src/renderer/src/pages/shifts/ShiftsPage.tsx`
- `tests/main/shiftHistory.test.ts`
