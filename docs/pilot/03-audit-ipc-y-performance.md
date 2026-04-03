# Auditoría: IPC y riesgo de bloqueo del proceso principal

## Contexto

En Electron, el **main process** atiende `ipcMain.handle`. Cualquier operación **larga o síncrona** (consultas grandes, PDF, SMTP) puede congelar la ventana si bloquea el hilo principal.

## Rutas IPC revisadas (alto uso en piloto)

| Área | Handler / servicio | Naturaleza del trabajo | Riesgo |
|------|---------------------|-------------------------|--------|
| POS | `sales:posCatalog`, `posProducts`, `posComplementProducts` | SQL lectura + árbol de categorías | Medio si catálogo crece mucho; hoy típicamente bajo |
| POS | `sales:create` | Transacción venta + inventario | Medio; tamaño acotado por ítems del ticket |
| Turnos | `shifts:listHistory`, `getSessionDetail` | SQL + agregados | Bajo–medio |
| Reportes | `reports:generateShiftClose` | `pdf-lib` + I/O | **Alto** en equipos lentos o PDFs pesados |
| Reportes | `reports:retryPendingEmails` | `nodemailer` + red | **Alto** si hay muchos jobs o SMTP lento |
| Inventario | balance / lotes | SQL | Medio con muchas filas |

## Decisiones

1. **Corto plazo (piloto)**: Mantener PDF y SMTP en main pero:
   - UI debe mostrar estado “Generando…” / “Reintentando…” (ya parcialmente en Reportes).
   - Evitar reintentos masivos sin límite en un solo click (cola pequeña en piloto).

2. **Medio plazo**: Mover generación de PDF y/o envío SMTP a **worker thread** (`worker_threads`) o proceso auxiliar, dejando el handler como “encolar + esperar resultado”.

3. **Medición**: Si en piloto hay quejas de “se traba”, registrar duración con `performance.now()` alrededor de `ReportService.generateShiftClose` y `EmailQueueService.retryPendingEmails` antes de refinar.

## Índices

Ya existe migración `0015_performance_indexes.sql`; mantener migraciones al día en builds piloto.

## Conclusión

**No es obligatorio** mover workers para el primer piloto si el volumen es bajo. **Sí es obligatorio** monitorear tiempos de PDF/SMTP y documentar límites operativos (tamaño de cola, tamaño de catálogo).
