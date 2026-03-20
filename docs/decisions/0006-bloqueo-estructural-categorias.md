# Decision 0006: bloqueo estructural de categorias

## Estado

Aprobada.

## Contexto

La reorganizacion de categorias abre un riesgo operativo serio: mover una categoria ya usada puede alterar el significado comercial del arbol, los formatos efectivos y la futura experiencia de ventas.

Resolver esto recalculando impacto completo del subarbol en cada edicion puede ser innecesariamente costoso para un sistema POS local que debe mantenerse fluido en hardware variado.

## Decision

Se introduce una marca persistente `structure_locked` en `categories`.

La categoria queda bloqueada estructuralmente cuando entra en operacion real, por ejemplo al:

- recibir subcategorias;
- recibir productos;
- recibir formatos propios.

Mientras `structure_locked = 1`, la categoria no puede cambiar de `parent_id` desde el flujo administrativo normal.

## Consecuencias

### Positivas

- la validacion del cambio de padre pasa a ser O(1);
- se evita recorrer arboles y ventas en cada edicion;
- el sistema protege categorias ya operativas contra reclasificaciones peligrosas.

### Costes

- el bloqueo es conservador: una vez activado, la categoria queda fija en su ubicacion actual;
- si en el futuro se necesita reorganizarla, hara falta un flujo administrativo especial.

## Nota de evolucion

La arquitectura queda preparada para una futura excepcion administrativa controlada, pero ese desbloqueo no forma parte de esta fase.
