# Decision 0003: patron CRUD navegable

## Estado

Aprobada.

## Contexto

El proyecto ya contaba con un primer CRUD funcional en `products`, pero su edicion ocurre en la misma pantalla del listado. Para `users` se requiere un flujo mas claro y reutilizable:

- listado principal como punto de entrada del modulo;
- columna `Acciones` con menu contextual;
- pantallas separadas para crear, ver y editar;
- carga por `id` para evitar depender del estado previo del listado.

Si cada modulo define su propio CRUD sin una convencion compartida, el renderer terminara con pantallas inconsistentes y contratos frontend/backend distintos para el mismo tipo de operacion.

## Decision

Se adopta el siguiente patron CRUD para los modulos administrativos:

### 1. Rutas por modulo

Cada modulo CRUD debe usar este esquema base:

- `/<modulo>`: listado principal;
- `/<modulo>/nuevo`: pantalla de alta;
- `/<modulo>/:id`: pantalla de detalle;
- `/<modulo>/:id/editar`: pantalla de edicion.

### 2. Separacion de responsabilidades

- `pages/<modulo>`: orquestan queries, mutations, navegacion y estados de pantalla.
- `components/<modulo>`: contienen piezas reutilizables como tabla, formulario y menu de acciones.
- `shared/ipc`: define el contrato que necesita el renderer.
- `main/services` y `main/repositories`: exponen operaciones completas para que el renderer no dependa de datos ya cargados.

### 3. Tabla principal

El primer bloque visible del modulo debe ser la tabla del listado.

La tabla debe incluir:

- columnas operativas del dominio;
- columna `Acciones`;
- estado vacio cuando no existan registros;
- navegacion desde acciones, no edicion inline.

### 4. Menu de acciones

La columna `Acciones` debe abrir un menu contextual liviano, aislado en un componente propio para poder reemplazarlo despues por un componente UI compartido.

Acciones minimas iniciales:

- `Ver`;
- `Editar`.

Cada accion navega a su propia pantalla.

### 5. Contrato minimo backend/frontend

Todo CRUD navegable debe exponer como minimo:

- `list`;
- `getById`;
- `create`;
- `update`.

`getById` es obligatorio cuando existen rutas `/:id` y `/:id/editar`, para soportar recarga de ventana, deep-linking y carga independiente del listado.

## Consecuencias

### Positivas

- los modulos quedan consistentes entre si;
- la navegacion es mas clara para operaciones administrativas;
- los formularios se vuelven reutilizables;
- el detalle y la edicion funcionan sin depender del estado previo del listado.

### Costes

- se agregan mas archivos por modulo;
- algunos CRUD ya existentes tendran que migrarse despues al nuevo patron.

## Checklist para nuevos modulos

- crear rutas `index`, `nuevo`, `:id`, `:id/editar`;
- extraer `Table`, `Form` y `ActionsMenu`;
- exponer `getById` en `shared`, `preload`, `ipc` y `service`;
- invalidar la query del listado al crear o editar;
- redirigir a la pantalla correspondiente despues de cada accion;
- documentar cualquier excepcion al patron.
