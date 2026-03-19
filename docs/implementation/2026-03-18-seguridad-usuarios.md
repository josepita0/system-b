# Seguridad y Usuarios

## Objetivo

Agregar una capa real de autenticacion y autorizacion al sistema local, sin depender solo de la UI.

## Lo implementado

### 1. Evolucion del modelo de datos

Se agregaron nuevas migraciones:

- `0008_auth_and_users.sql`
- `0009_user_documents.sql`
- `0010_auth_sessions_and_recovery.sql`

Estas migraciones extienden `employees` para que tambien represente al usuario autenticable y agregan:

- sesiones locales;
- codigos de recuperacion;
- documentacion personal;
- auditoria basica.

### 2. Autenticacion local

Se implemento:

- `login`
- `logout`
- `me`
- persistencia local de sesion
- creacion automatica del primer `Administrador`

La sesion actual se guarda localmente en un archivo de sesion del sistema y se valida contra `auth_sessions`.

## Politica de contrasenas

- las contrasenas no se guardan en texto plano;
- se almacenan como hash fuerte con `scrypt`;
- ningun rol puede leer la contrasena actual de otro usuario.

## Recuperacion de contrasena

Se implemento un modelo por codigos personales:

- se generan codigos individuales;
- solo se muestran en el momento de emision o regeneracion autorizada;
- en base de datos se guarda un hash del codigo, no el valor original;
- al usar un codigo, este queda invalidado.

## Roles aplicados

Roles activos:

- `admin`
- `manager`
- `employee`

Permisos efectivos:

- `admin`: gestiona perfiles y credenciales de cualquier rol.
- `manager`: gestiona perfiles solo de `employee`.
- `employee`: no administra usuarios.

## Restricciones actuales

- `employee`: interfaz centrada en `Ventas`.
- `manager`: acceso a usuarios, productos, turnos y reportes, pero sin emitir credenciales ni regenerar recovery codes.
- `admin`: acceso total administrativo y emision de acceso inicial.

## Flujo de alta y acceso

- `manager` puede crear perfiles `employee`, pero no recibe secretos de acceso.
- `admin` emite la credencial inicial y los codigos de recuperacion desde una accion separada.
- toda credencial inicial obliga cambio de clave en el primer ingreso.

## Seguridad aplicada en backend

Se agrego control de permisos en:

- handlers IPC;
- servicios de autenticacion y usuarios;
- control de acceso para productos, turnos y reportes.

Esto evita que esconder botones en la UI sea la unica defensa del sistema.

## Documentacion personal

Usuarios no administradores pueden cargar su documentacion personal:

- `DNI-NIE`
- `Certificado de manipulacion de alimentos`
- `Numero de seguridad social`
- `Permiso de trabajo`

Los archivos se almacenan fuera del renderer y la metadata sensible se cifra localmente.

## Archivos clave del modulo

- `src/main/services/authService.ts`
- `src/main/services/userService.ts`
- `src/main/services/documentService.ts`
- `src/main/services/authorizationService.ts`
- `src/main/ipc/authHandlers.ts`
- `src/main/ipc/userHandlers.ts`
- `src/main/ipc/documentHandlers.ts`
- `src/shared/ipc/auth.ts`
- `src/shared/ipc/users.ts`
- `src/shared/ipc/documents.ts`
- `src/renderer/src/pages/auth/LoginPage.tsx`
- `src/renderer/src/pages/auth/RecoverPasswordPage.tsx`
- `src/renderer/src/pages/auth/ChangePasswordPage.tsx`
- `src/renderer/src/pages/users/UserListPage.tsx`
- `src/renderer/src/pages/users/UserDetailPage.tsx`
- `src/renderer/src/pages/users/UserDocumentsPage.tsx`

## Validaciones realizadas

Se validaron con exito:

- `npm run typecheck`
- `npm test`
- `npm run build:main`
- `npm run build:renderer`

## Nota operativa

El primer administrador se genera automaticamente si no existe ninguno. Sus credenciales iniciales y codigos de recuperacion quedan registradas localmente para el primer acceso del sistema, pero ese bootstrap deja de exponerse cuando el `admin` cambia o recupera su contrasena.
