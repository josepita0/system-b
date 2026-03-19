# RBAC y credenciales de usuarios

## Objetivo

Endurecer la gestion de usuarios para separar claramente:

- administracion de perfiles;
- emision de credenciales;
- primer acceso y cambio obligatorio de clave.

## Cambios aplicados

### 1. Separacion de permisos

Se reemplazo la dependencia exclusiva de la jerarquia de roles por permisos mas finos:

- `users.manage_profiles`
- `users.manage_credentials`
- `users.manage_roles.employee`
- `users.manage_roles.manager`
- `users.manage_roles.admin`

Esto permite que `manager` conserve gestion operativa sin cruzar la frontera sensible de autenticacion.

### 2. Nuevo alcance por rol

- `admin`:
  puede crear usuarios de cualquier rol, emitir credenciales iniciales y regenerar codigos de recuperacion.
- `manager`:
  solo puede crear, listar, ver y editar usuarios `employee`.
- `employee`:
  no administra usuarios.

## Flujo seguro implementado

### Alta de usuario por `manager`

Cuando un `manager` crea un `employee`:

- el backend crea el perfil;
- no se genera una clave visible para el `manager`;
- `users.create()` devuelve solo metadatos del usuario;
- el renderer no recibe contrasena temporal ni recovery codes.

### Emision de acceso por `admin`

La emision de acceso inicial se movio a una accion exclusiva de administrador:

- genera contrasena temporal;
- genera codigos de recuperacion;
- marca `mustChangePassword = 1`;
- deja trazabilidad en `audit_logs`.

### Primer inicio de sesion

Si el usuario entra con una credencial inicial:

- puede autenticarse;
- es redirigido obligatoriamente a cambiar su clave;
- no puede seguir navegando hasta completar ese cambio.

## Bootstrap del administrador

Se mantuvo la creacion automatica del primer `admin`, pero se endurecio su exposicion:

- `initial-admin-access.json` solo se considera valido mientras el administrador inicial siga pendiente de cambio de clave;
- cuando el `admin` cambia o recupera su contrasena, el archivo bootstrap se elimina;
- la UI ya no deberia seguir mostrando una credencial inicial obsoleta.

## Auditoria agregada

Se registran en `audit_logs` acciones sensibles relacionadas con usuarios:

- `user.created`
- `user.updated`
- `user.credentials_issued`
- `user.recovery_codes_regenerated`
- `user.password_changed`
- `user.password_recovered`

Los logs no guardan secretos ni valores de credenciales.

## Archivos clave

- `src/main/services/authService.ts`
- `src/main/services/userService.ts`
- `src/main/services/authorizationService.ts`
- `src/main/repositories/auditLogRepository.ts`
- `src/main/ipc/authHandlers.ts`
- `src/main/ipc/userHandlers.ts`
- `src/shared/types/user.ts`
- `src/shared/ipc/users.ts`
- `src/renderer/src/pages/auth/ChangePasswordPage.tsx`
- `src/renderer/src/pages/users/UserDetailPage.tsx`
- `src/renderer/src/components/users/UserForm.tsx`

## Validacion

Se validaron los cambios con:

- `npm run typecheck`
- `npm test`
