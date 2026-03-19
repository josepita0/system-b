# GitHub Hardening Inicial

## Objetivo

Registrar la deuda de seguridad detectada durante la preparacion del proyecto para versionado en GitHub.

## Prioridad alta

### 1. Restringir `bootstrapInfo`

Archivos involucrados:

- `src/main/services/authService.ts`
- `src/main/ipc/authHandlers.ts`
- `src/renderer/src/pages/auth/LoginPage.tsx`

Estado:

Parcialmente mitigado.

`initial-admin-access.json` ahora se invalida cuando el administrador inicial deja el estado de primer acceso, evitando que la UI siga mostrando una credencial bootstrap obsoleta.

Pendiente:

- devolver esta informacion solo durante bootstrap controlado;
- quitar la exposicion permanente desde la UI comun de login;
- definir una estrategia operativa mas cerrada para entrega del acceso inicial.

### 2. Endurecer persistencia de sesion local

Archivo involucrado:

- `src/main/security/sessionStorage.ts`

Problema:

La sesion se guarda en texto plano como `current-session.json`.

Accion recomendada:

- reducir el tiempo de vida de la sesion persistida;
- evaluar cifrado del token o almacenamiento ligado al usuario del sistema;
- invalidar automaticamente sesiones antiguas o inconsistentes.

### 3. Revisar manejo de `smtp_password`

Archivos involucrados:

- `src/main/database/migrations/0001_init.sql`
- `src/main/services/emailQueueService.ts`

Problema:

La configuracion SMTP puede quedar expuesta si alguna base local se filtra.

Accion recomendada:

- cifrar el valor en reposo o moverlo a un secreto externo/local no versionado;
- evitar exportar o respaldar la base sin controles.

## Prioridad media

### 4. Revisar modelo de clave local `app.key`

Archivo involucrado:

- `src/main/security/encryption.ts`

Problema:

La clave local vive junto al resto de datos de la aplicacion, por lo que no representa una frontera fuerte frente a acceso al filesystem.

Accion recomendada:

- documentar su alcance real;
- evaluar integracion con almacenamiento protegido del sistema operativo.

### 5. Agregar `Content-Security-Policy` al renderer

Archivo involucrado:

- `index.html`

Problema:

El renderer local no define CSP explicita.

Accion recomendada:

- agregar politica minima `default-src 'self'`;
- permitir solo los recursos realmente necesarios para el bundle final.

### 6. Evaluar `sandbox`

Archivo involucrado:

- `src/main/windows/createMainWindow.ts`

Problema:

La ventana principal mantiene `sandbox: false`.

Accion recomendada:

- validar compatibilidad del preload y dependencias;
- migrar a `sandbox: true` si el puente actual lo permite.

## Criterio de cierre

El proyecto estara listo para abrir el repositorio al publico cuando:

- no pueda filtrarse acceso inicial desde la UI comun;
- la sesion local tenga una estrategia mas fuerte;
- SMTP no dependa de una base facilmente exportable;
- el renderer tenga CSP y la configuracion de Electron quede revisada.
