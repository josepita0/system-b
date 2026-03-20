# Decision 0005: categorias padre y herencia de formatos

## Estado

Aprobada.

## Contexto

La primera reestructuracion del catalogo introdujo categorias jerarquicas y formatos de venta por categoria. Sin embargo, aparecio un vacio funcional:

- cualquier categoria activa podia aparecer como `Categoria padre`;
- el sistema no diferenciaba entre una categoria operativa y una categoria habilitada para contener subcategorias;
- los formatos de `Licores` y categorias hijas como `Ron` o `Vodka` quedaban repetidos en vez de heredarse de forma controlada.

Esto generaba un modelo menos expresivo de lo que el negocio necesita y dejaba la UI con decisiones ambiguas.

## Decision

Se ajusta el dominio de categorias con dos capacidades explicitas:

### 1. `supports_children`

Determina si una categoria puede ser utilizada como `Categoria padre`.

Reglas:

- una categoria con `supports_children = 1` puede contener subcategorias;
- una categoria con `supports_children = 0` no debe aparecer en el selector de categoria padre;
- una categoria con capacidad de contener hijas sigue siendo operativa y puede tener productos y formatos propios.

### 2. `inherits_sale_formats`

Determina si una categoria hija hereda los formatos de su categoria padre.

Reglas:

- si esta activa, la categoria usa los formatos efectivos de la categoria superior;
- si esta desactivada, la categoria administra su propia lista en `category_sale_formats`;
- el usuario puede desligar la herencia y volver a ella despues.

## Consecuencias

### Positivas

- el selector `Categoria padre` deja de alimentarse con categorias que no deben reutilizarse estructuralmente;
- los formatos de categorias superiores pueden propagarse sin duplicar configuracion;
- una categoria padre puede seguir funcionando como categoria de negocio completa;
- la UI puede mostrar claramente la diferencia entre formatos propios y formatos heredados.

### Costes

- el contrato de categoria se vuelve mas rico;
- la administracion de formatos requiere estados de lectura y edicion;
- la herencia agrega resolucion de formatos efectivos en servicio y renderer.

## Implementacion base

La decision se refleja en:

- `src/main/database/migrations/0013_category_parent_support_and_inheritance.sql`
- `src/main/repositories/categoryRepository.ts`
- `src/main/services/categoryService.ts`
- `src/renderer/src/components/products/CategoryForm.tsx`
- `src/renderer/src/components/products/SaleFormatManager.tsx`

## Nota operativa

El arbol de categorias mantiene `parent_id` como relacion jerarquica real, pero deja de usarlo como unica senal para decidir si una categoria puede actuar como padre.
