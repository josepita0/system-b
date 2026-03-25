# Modulo de ventas POS (marzo 2026)

## Objetivo

Conectar el flujo de ventas del empleado con las tablas `sales` y `sale_items`, sesion de caja abierta (`cash_sessions`), permiso `sales.use` y el catalogo jerarquico existente (categorias y formatos).

## Cambios principales

- **Migracion `0017_sale_items_pos_details.sql`**: columnas opcionales `sale_format_id` y `complement_product_id` en `sale_items` para trazabilidad de formato y complemento (p. ej. combinados).
- **Backend**: `SaleRepository`, `RecipeRepository`, `SaleService` con transaccion unica para venta + movimientos de inventario `exit` por recetas de productos `compound`.
- **IPC `sales`**: `posCatalog`, `posProducts`, `posComplementProducts`, `create` — todos con `requirePermission('sales.use')`.
- **Inventario**: descuento proporcional a cantidad vendida segun `recipes` / `recipe_items`; validacion de stock con `inventory_balance_view`.
- **UI**: `SalesPage` con arbol de categorias, listado de productos, carrito y modal de formato/complemento cuando aplica.

## Archivos clave

- `src/main/services/saleService.ts`
- `src/main/repositories/saleRepository.ts`
- `src/main/ipc/saleHandlers.ts`
- `src/shared/ipc/sales.ts`
- `src/renderer/src/pages/sales/SalesPage.tsx`
- `tests/main/saleService.test.ts`
