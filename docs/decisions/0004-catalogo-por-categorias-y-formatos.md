# Decision 0004: catalogo por categorias y formatos

## Estado

Aprobada.

## Contexto

El proyecto nacio con un CRUD plano de `products`, suficiente para el bootstrap del catalogo, pero insuficiente para el levantamiento funcional mas reciente:

- los productos ahora deben pertenecer a categorias;
- algunas categorias requieren subcategorias, especialmente `Licores`;
- ciertos grupos pueden habilitar formatos de venta especiales;
- algunos formatos, como `Combinado`, requieren complemento desde otra rama del catalogo.

Si se modelan estos casos como productos duplicados o como condicionales solo de frontend, el sistema quedara fragil para POS, reportes, inventario y futuras variantes comerciales.

## Decision

Se redefine el dominio del catalogo con estas reglas:

### 1. Categoria como eje del catalogo

Todo producto debe pertenecer a una categoria activa.

Se introduce una jerarquia padre-hijo en `categories` para soportar arboles como:

- `Refrescos`
- `Cervezas`
- `Cafes`
- `Licores`
  - `Ron`
  - `Vodka`
  - `Ginebra`
  - `Whisky`
  - `Vinos`

### 2. Formato de venta como capacidad reusable

Los formatos de venta no se modelan como productos derivados ni SKUs adicionales.

Se introducen:

- `sale_formats`: catalogo reusable de formatos;
- `category_sale_formats`: habilitacion de formatos por categoria.

Esto permite que una categoria habilite `copa`, `chupito`, `combinado`, `piedra` o `vaquerito` sin multiplicar el catalogo de productos.

### 3. Metadata para complementos futuros

Los formatos pueden declarar:

- `requires_complement`
- `complement_category_root_id`

Con esto, la futura seleccion POS podra resolver reglas como `Combinado` sin hardcodear nombres de categorias ni de formatos en la UI.

### 4. Servicios separados por dominio

Se conserva `ProductService` para operaciones de producto y se agregan:

- `CategoryService`
- `SaleFormatService`

La validacion fuerte del dominio vive en `main/services` y las restricciones relacionales en SQLite.

## Consecuencias

### Positivas

- el catalogo queda listo para escalar a POS por pasos;
- se evita duplicar productos por cada formato comercial;
- se soportan jerarquias de negocio sin rehacer el esquema luego;
- la asignacion de formatos por categoria vuelve configurable una regla que hoy solo aplica a licores, pero manana puede extenderse.

### Costes

- la pantalla administrativa de productos deja de ser un CRUD simple;
- aumentan los contratos IPC y los componentes del renderer;
- el conteo y la seleccion de productos ahora dependen del estado de categorias activas.

## Implementacion base

La decision se materializa en:

- `src/main/database/migrations/0012_categories_and_sale_formats.sql`
- `src/main/repositories/categoryRepository.ts`
- `src/main/repositories/saleFormatRepository.ts`
- `src/main/services/categoryService.ts`
- `src/main/services/saleFormatService.ts`
- `src/renderer/src/pages/products/ProductsPage.tsx`

## Nota operativa

El POS no se reestructura todavia en esta fase. Solo se deja preparado el dominio para una fase posterior donde el flujo de venta pueda ser:

- categoria;
- producto;
- formato;
- complemento, si aplica.
