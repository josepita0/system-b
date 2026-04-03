# Piloto: datos iniciales (seed) y backup

## Datos que ya trae el sistema

Las migraciones SQLite crean el esquema y **semillas base**:

- Tabla `settings` (fila `id = 1`).
- Categorías y formatos de venta iniciales (`0012_categories_and_sale_formats.sql`), incluyendo `refrescos`, `cervezas`, etc.

No es obligatorio un script aparte para tener **árbol de categorías mínimo**: ya existe tras el primer arranque con migraciones aplicadas.

## Catálogo operativo para el piloto

1. Crear **productos** y **precios** desde la pantalla **Productos** (rol manager+).
2. Asignar **formatos** por categoría según la operación real del bar.
3. Para productos compuestos, definir **recetas** e inventario de ingredientes antes de vender en POS.

## Respaldo mínimo (recomendado antes y después del piloto)

La base de datos vive en el directorio de datos de la aplicación:

- **Ruta por defecto**: carpeta `data` dentro de `app.getPath('userData')` de Electron, archivo **`system-barra.sqlite`**.
- **Override desarrollo / scripts**: variable de entorno `SYSTEM_BARRA_DATA_DIR` apunta al directorio que contiene `system-barra.sqlite` (ver `src/main/database/connection.ts`).

Archivos relacionados que conviene respaldar juntos:

- `system-barra.sqlite` (+ `-wal` / `-shm` si existen, para consistencia en copia en frío cerrar la app antes de copiar).
- `app.key` (cifrado local; sin él no se descifran secretos `enc:` guardados en la misma máquina).
- `current-session.json` (opcional; es re-innatible cerrando sesión).

### Windows (manual)

1. Cerrar **Sistema Barra**.
2. Copiar la carpeta `data` completa desde el directorio de datos de usuario de la app al medio de backup.

### Script PowerShell

Ver [`scripts/backup-userdata-data.ps1`](../../scripts/backup-userdata-data.ps1): copia la carpeta `data` (deduce `AppData\Roaming\Sistema Barra\data` o usa `SYSTEM_BARRA_DATA_DIR`).

## Restauración

1. Cerrar la aplicación.
2. Reemplazar la carpeta `data` (o el contenido de `SYSTEM_BARRA_DATA_DIR`) con el backup.
3. Abrir la app y validar login y un cierre de turno de prueba.

## Entorno limpio para segundo piloto

Tras un piloto, para “reset” completo en la misma máquina:

1. Cerrar la app.
2. Eliminar o renombrar la carpeta `data` bajo `userData` (o borrar solo `system-barra.sqlite` **y** entender que se pierden todos los datos).
3. Al abrir de nuevo, se ejecutan migraciones desde cero (nuevo admin / wizard según configuración actual).
