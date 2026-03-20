# Blindaje de edicion de categorias

## Objetivo

Proteger la estructura del catalogo contra errores operativos al mover categorias ya usadas dentro del negocio.

## Cambios aplicados

### 1. Bloqueo estructural persistente

Se agrego `structure_locked` a `categories` mediante `0014_category_structure_lock.sql`.

La migracion hace backfill inicial y bloquea categorias que ya tienen:

- subcategorias activas;
- productos activos;
- formatos propios asignados.

### 2. Activacion barata del bloqueo

La categoria pasa a `structure_locked = 1` cuando:

- recibe una subcategoria nueva;
- recibe productos nuevos o actualizados;
- recibe formatos propios.

Esto evita recalcular impacto profundo del arbol en cada edicion.

### 3. Restriccion de cambio de padre

`CategoryService.update()` ahora rechaza cambios de `parentId` cuando la categoria ya esta bloqueada estructuralmente.

La restriccion no impide otros cambios administrativos como nombre, slug u orden, siempre que no alteren la ubicacion en el arbol.

### 4. Señalizacion en UI

`CategoryForm` muestra un aviso cuando la categoria ya entro en operacion y deshabilita el cambio de categoria padre desde el formulario.

## Archivos clave

- `src/main/database/migrations/0014_category_structure_lock.sql`
- `src/main/repositories/categoryRepository.ts`
- `src/main/services/categoryService.ts`
- `src/main/services/productService.ts`
- `src/renderer/src/components/products/CategoryForm.tsx`
- `tests/main/categoryService.test.ts`
- `tests/main/productService.test.ts`

## Validacion

Se valido con:

- `npm run typecheck`

La suite completa de pruebas puede seguir bloqueada si el entorno de desarrollo tiene `better-sqlite3` ocupado por `npm run dev`.
