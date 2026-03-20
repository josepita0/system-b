# Ajuste de categorias padre y herencia de formatos

## Objetivo

Refinar el modulo de categorias para:

- aislar que categorias pueden actuar como padre;
- permitir que una categoria padre siga siendo operativa;
- heredar formatos desde categorias superiores hacia hijas;
- permitir desligar la herencia y administrar formatos propios.

## Cambios aplicados

### 1. Modelo de datos

Se agrego la migracion `0013_category_parent_support_and_inheritance.sql` para introducir:

- `supports_children`
- `inherits_sale_formats`

Tambien se hizo backfill inicial:

- categorias raiz operativas quedaron habilitadas para contener hijas, excepto `General`;
- categorias hijas existentes quedaron heredando formatos por defecto;
- se limpiaron asignaciones directas de formatos en hijas heredadas para evitar duplicidad semantica.

### 2. Dominio de categorias

`Category` ahora expone:

- capacidad de contener subcategorias;
- estado de herencia de formatos;
- formatos asignados directamente;
- formatos efectivos;
- informacion de la categoria desde la que hereda.

`CategoryService` resuelve:

- validacion de padre permitido;
- resolucion de formatos efectivos;
- bloqueo de edicion directa mientras exista herencia activa.

### 3. UI administrativa

Se ajusto el formulario de categorias para incluir:

- `Puede contener subcategorias`
- `Heredar formatos de la categoria padre`

El selector `Categoria padre` ahora lista solo categorias habilitadas como contenedoras.

El panel de formatos por categoria ahora:

- muestra herencia activa;
- usa la lista efectiva en modo lectura cuando hereda;
- permite desligar la herencia para pasar a lista propia.

## Archivos clave

- `src/shared/types/product.ts`
- `src/shared/schemas/productSchema.ts`
- `src/main/database/migrations/0013_category_parent_support_and_inheritance.sql`
- `src/main/repositories/categoryRepository.ts`
- `src/main/services/categoryService.ts`
- `src/renderer/src/components/products/CategoryForm.tsx`
- `src/renderer/src/components/products/CategoryTree.tsx`
- `src/renderer/src/components/products/SaleFormatManager.tsx`
- `src/renderer/src/pages/products/ProductsPage.tsx`

## Validacion

Se validaron los cambios con:

- `npm run typecheck`

La corrida completa de `npm test` quedo bloqueada por el proceso activo de desarrollo (`npm run dev`), porque mantiene ocupado el binario de `better-sqlite3` requerido por `npm run native:node`.
