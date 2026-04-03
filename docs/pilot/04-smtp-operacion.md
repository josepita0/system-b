# SMTP: operación en piloto

## Dónde se guarda la configuración

- Tabla SQLite **`settings`** (fila `id = 1`): `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`, `smtp_secure`.
- La UI de **Reportes** permite editar y **probar conexión** sin mostrar la contraseña guardada.

## Contraseña

1. **Variable de entorno** (recomendada si el operador no debe ver la clave en la base):
   - `SYSTEM_BARRA_SMTP_PASSWORD`: si está definida, **tiene prioridad** sobre el valor en base (ver `src/main/services/emailQueueService.ts` y `settingsService`).

2. **En base**, la app puede guardar:
   - Texto plano (compatibilidad histórica), o
   - Valor cifrado con prefijo `enc:` usando `app.key` (misma lógica que otros secretos locales).

Al guardar desde la pantalla de configuración SMTP, las contraseñas nuevas se persisten como **`enc:...`**.

## Probar envío

1. Completar host, puerto, usuario, TLS según el proveedor.
2. Indicar contraseña solo si se desea **establecer o cambiar** (dejar en blanco para conservar la actual).
3. Pulsar **Probar conexión SMTP**: ejecuta `verify()` de Nodemailer (sin enviar correo real).
4. Tras un cierre de turno, usar **Generar PDF** y la cola de correo; **Reintentar correos pendientes** reprocesa jobs fallidos.

## Cola y fallos

- Los errores de envío quedan registrados en intentos del job (`reports` / repositorio de `report_jobs`).
- Revisar también el log local `logs/app.log` en el directorio de datos de la app (si existe) para soporte.

## Checklist rápido proveedor

- [ ] Puerto correcto (587 STARTTLS vs 465 SSL).
- [ ] `smtp_secure` alineado con el puerto.
- [ ] Usuario/contraseña válidos; cuentas con “app password” si aplica.
- [ ] Firewall local permite salida al servidor SMTP.
