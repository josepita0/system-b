# Reestructuracion de productos por categorias

## Objetivo

Reemplazar el catalogo plano de productos por una base administrativa y de dominio donde:

- los productos dependan de categorias;
- las categorias puedan organizarse jerarquicamente;
- los formatos de venta se administren como catalogo reusable;
- cada categoria pueda habilitar sus propios formatos.

## Cambios aplicados

### 1. Nueva capa de persistencia

Se agrego la migracion `0012_categories_and_sale_formats.sql` con:

- tabla `categories`;
- tabla `sale_formats`;
- pivote `category_sale_formats`;
- columna `products.category_id`;
- seeds iniciales para categorias base y formatos comunes;
- triggers para exigir categoria en `products`.

Tambien se creo una categoria `General` para backfill de productos existentes.

### 2. Dominio y validacion

Se extendieron los tipos y schemas compartidos para soportar:

- `Category`
- `CategoryTreeNode`
- `SaleFormat`
- `ProductInput.categoryId`
- entradas de categoria y formato
- asignacion de formatos por categoria

En backend se separaron responsabilidades con:

- `ProductService`
- `CategoryService`
- `SaleFormatService`

### 3. Reestructuracion del modulo administrativo

La pagina `ProductsPage` paso de un CRUD plano a un panel en tres zonas:

- formulario y arbol de categorias;
- formulario y tabla de productos filtrados por categoria;
- catalogo global de formatos y asignacion por categoria.

Esto deja visible la relacion:

- categoria -> productos
- categoria -> formatos habilitados

### 4. Seguridad y consistencia

Los handlers del modulo dejaron de depender solo de jerarquia de rol y ahora validan `products.manage`.

Se agregaron validaciones para:

- categoria padre existente y activa;
- prevencion de ciclos en el arbol;
- imposibilidad de desactivar categorias con subcategorias o productos activos;
- formatos con complemento apuntando solo a categorias raiz.

## Archivos clave

- `src/main/database/migrations/0012_categories_and_sale_formats.sql`
- `src/main/repositories/productRepository.ts`
- `src/main/repositories/categoryRepository.ts`
- `src/main/repositories/saleFormatRepository.ts`
- `src/main/services/productService.ts`
- `src/main/services/categoryService.ts`
- `src/main/services/saleFormatService.ts`
- `src/main/ipc/productHandlers.ts`
- `src/shared/types/product.ts`
- `src/shared/schemas/productSchema.ts`
- `src/shared/ipc/products.ts`
- `src/renderer/src/pages/products/ProductsPage.tsx`
- `src/renderer/src/components/products/CategoryForm.tsx`
- `src/renderer/src/components/products/CategoryTree.tsx`
- `src/renderer/src/components/products/ProductForm.tsx`
- `src/renderer/src/components/products/ProductTable.tsx`
- `src/renderer/src/components/products/SaleFormatManager.tsx`

## Validacion

Se validaron los cambios con:

- `npm run typecheck`
- `npm test`
