# Piloto: checklist operativo y criterios de aceptación

## Objetivo

Validar en sitio que **todos los módulos actuales** funcionan de extremo a extremo, con foco en **velocidad/UX en caja**, **exactitud de datos** y **envío SMTP** de cierres.

## Pre-requisitos del entorno

- [ ] Node/Electron según `docs/decisions/0001-node-version.md` y `package.json` (`engines`).
- [ ] Build portable o `npm run dev` en máquina piloto.
- [ ] SMTP operativo o override `SYSTEM_BARRA_SMTP_PASSWORD` documentado (ver `docs/pilot/04-smtp-operacion.md` cuando exista en el repo o `docs/setup/002-comandos-del-proyecto.md`).
- [ ] Destinatarios de reporte configurados en base (tabla `report_recipients`) según procedimiento interno.

## Flujo 1 — Instalación y primer acceso

| Paso | Acción | Criterio de aceptación |
|------|--------|-------------------------|
| 1.1 | Primer arranque / wizard | Wizard visible solo cuando corresponde; tras completar, login normal sin wizard forzado. |
| 1.2 | Login administrador | Sesión estable; rol/admin visibles en UI. |
| 1.3 | Cambio de clave obligatoria | Usuario con `mustChangePassword` no accede al menú hasta cambiar clave. |
| 1.4 | Recuperación de contraseña | Flujo recuperar → código válido → nueva clave → login OK. |

## Flujo 2 — Turnos y caja (gerencia)

| Paso | Acción | Criterio de aceptación |
|------|--------|-------------------------|
| 2.1 | Abrir turno | Sesión `open`; histórico muestra fila “En curso” con totales en vivo. |
| 2.2 | Cerrar turno | Sesión `closed`; `esperado` / `contado` / `diferencia` coherentes; **por conciliar** refleja pagarés abiertos del turno. |
| 2.3 | Histórico | Manager ve cierres; empleado ve reglas de visibilidad documentadas (solo elegibles + turno abierto actual). |
| 2.4 | Detalle de sesión | Ventas listadas con tipo (contado / cargo / cobro pagaré) y totales correctos. |

## Flujo 3 — POS (empleado / gerencia)

| Paso | Acción | Criterio de aceptación |
|------|--------|-------------------------|
| 3.1 | Sin turno | Mensaje claro; botón abrir turno o derivación operativa. |
| 3.2 | Venta contado | Carrito, cobro en efectivo (si aplica modal), total y descuento de inventario acorde a recetas. |
| 3.3 | Cuenta pagaré | Cargo no suma a efectivo del turno hasta liquidación; saldo de cuenta coherente. |
| 3.4 | Liquidar pagaré | `tab_payment` incrementa efectivo esperado del turno correctamente. |
| 3.5 | VIP / montos manuales | Monto cobrado acorde a condición configurada. |
| 3.6 | Formatos y complementos | Productos con formato único o múltiple se comportan según catálogo; complemento obligatorio bloquea hasta elegir. |

## Flujo 4 — Reportes, PDF y SMTP

| Paso | Acción | Criterio de aceptación |
|------|--------|-------------------------|
| 4.1 | Generar PDF de cierre | Archivo generado; contenido alineado con sesión (ventas efectivo + por conciliar). |
| 4.2 | Cola SMTP | Jobs pendientes visibles en UI; estado e intentos coherentes. |
| 4.3 | Reintento manual | `Reintentar` procesa jobs válidos; errores visibles sin bloquear la app. |
| 4.4 | Probar SMTP (desde app) | Conexión verificada sin revelar contraseña guardada en UI. |

## Flujo 5 — Administración

| Paso | Acción | Criterio de aceptación |
|------|--------|-------------------------|
| 5.1 | Productos / categorías / formatos | CRUD básico; herencia de formatos y bloqueo estructural según reglas de negocio. |
| 5.2 | Usuarios y credenciales | Roles y permisos efectivos en IPC (no solo ocultar menú). |
| 5.3 | Inventario y consumos | Movimientos y balances razonables en casos de prueba piloto. |
| 5.4 | Licencia (admin) | Feature flags respetados en reportes/PDF/email. |

## Criterios medibles rápidos (UX / rendimiento)

- **Tiempo percibido POS**: de selección de categoría a producto visible &lt; **2 s** en catálogo típico (&lt; 200 ítems por categoría) en PC piloto.
- **Sin congelamiento**: durante generación de PDF o reintento SMTP la ventana sigue respondiendo (no bloqueo prolongado &gt; 3 s sin feedback).
- **Errores**: cualquier fallo IPC muestra mensaje entendible en UI o en cola SMTP, no solo consola.

## Post-piloto

- [ ] Backup de datos tomado (ver `docs/pilot/02-seed-y-backup.md`).
- [ ] Lista de bugs priorizados (críticos de caja / stock primero).
