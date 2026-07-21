# Decision 0007: Payment method in sales

## Estado

Aprobada.

## Contexto

Las ventas del sistema siempre se registraron como efectivo. No existía forma de distinguir si un pago se realizó en efectivo (CASH) o con tarjeta (CARD). Esta información es necesaria para:

- mostrar el desglose en el cierre de turno;
- generar reportes PDF con totales separados;
- exponer KPIs con discriminación por método de pago.

## Decisión

Agregar la columna `payment_method TEXT` a la tabla `sales` con valores `'CASH'` o `'CARD'`, y propagar el cambio a través de todas las capas para que el usuario pueda seleccionar el método de pago al cobrar.

Los totales de efectivo/tarjeta se computan desde la tabla `sales` (no se almacenan en `cash_sessions`), lo que evita migraciones adicionales y mantiene la fuente de verdad única.

## Impacto: archivos a modificar

### Fase 1 — Base de datos (1 archivo nuevo)

| Archivo | Cambio |
|---|---|
| `src/main/database/migrations/0027_sales_payment_method.sql` | `ALTER TABLE sales ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK(payment_method IN ('CASH','CARD'))` |

### Fase 2 — Capa compartida (4 archivos)

| Archivo | Cambio |
|---|---|
| `src/shared/types/sale.ts` | `paymentMethod?: 'CASH'\|'CARD'` en `CreateSaleInput`, `SettleTabInput`, `SaleCreated`, `TabSettlementResult` |
| `src/shared/types/shift.ts` | `paymentMethod: string\|null` en `ShiftSessionSaleDetail`; `cashSalesTotal`, `cardSalesTotal` en `CashSessionHistoryEntry` |
| `src/shared/types/dashboard.ts` | `cashPaidTotal`, `cardPaidTotal` en `DashboardKpis.sales` y `DashboardDailySalesRow` |
| `src/shared/schemas/saleSchema.ts` | `paymentMethod: z.enum(['CASH','CARD']).optional().default('CASH')` en `createSaleSchema` y `settleTabSchema` |

### Fase 3 — Repositorios (3 archivos)

| Archivo | Cambio |
|---|---|
| `src/main/repositories/saleRepository.ts` | `createSaleWithItems` y `settleTabWithPayment`: agregar parámetro `paymentMethod`, incluir en `INSERT INTO sales` |
| `src/main/repositories/shiftRepository.ts` | `getSessionSalesDetail`: agregar `s.payment_method` al SELECT. Nueva función `getSalesTotalByPaymentMethod(sessionId)` que retorna `{cashTotal, cardTotal, total}`. `getHistoryEntryById`/`getHistoryEntriesByIds`: integrar cash/card split vía subquery |
| `src/main/repositories/dashboardRepository.ts` | `getSalesTotals`, `listDailySales`, `listTopEmployees`: agregar columnas cash/card con `SUM(CASE WHEN payment_method = 'CASH' ...)` |

### Fase 4 — Servicios (2 archivos)

| Archivo | Cambio |
|---|---|
| `src/main/services/saleService.ts` | `createSale`: extraer `paymentMethod` del input validado, pasar a `createSaleWithItems`. `settleTab`: extraer `paymentMethod` del input, pasar a `settleTabWithPayment` |
| `src/main/services/reportBuilder.ts` | Separar `totalContado` en `totalCash` + `totalCard`. La fila de resumen pasa de 3 a 4 columnas: "Total (Efectivo)" / "Total (Tarjeta)" / "Total (Contado)" / "Total general" |

### Fase 5 — Renderer (3 archivos)

| Archivo | Cambio |
|---|---|
| `src/renderer/src/pages/sales/SalesPage.tsx` | Modal de cobro y modal de liquidar cuenta: agregar selector CASH/CARD (radio). Si CARD: ocultar "Monto recibido" + "Cambio". Pasar `paymentMethod` en ambas mutations |
| `src/renderer/src/pages/shifts/ShiftsPage.tsx` | Tabla de histórico: agregar columnas "Efectivo" / "Tarjeta". Lista de ventas del detalle: mostrar `· Efectivo` o `· Tarjeta` |
| `src/renderer/src/pages/dashboard/DashboardPage.tsx` | Nueva KPI card "Ventas al contado" con total + sublabel "Efectivo: X / Tarjeta: Y" |

## Total: 12 archivos modificados + 1 archivo nuevo

## Consecuencias

### Positivas
- visibilidad completa del método de pago en todas las capas;
- reportes y KPIs reflejan la realidad operativa;
- ventas históricas mantienen compatibilidad (default CASH);
- sin cambios en `cash_sessions` (totales se computan desde `sales`).

### Costes
- tabla de turnos agrega dos columnas a un listado ya extenso;
- modal de pago agrega una decisión extra al usuario;
- requiere actualizar mocks o tests si existen.
