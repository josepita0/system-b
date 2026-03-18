# Decision 0001: Version de Node.js

## Estado

Aprobada

## Decision

Usaremos `Node.js 22 LTS` en su ultima revision estable disponible al momento de instalarlo.

En Windows, la recomendacion para este proyecto es instalar:

- `Node.js 22 LTS x64`
- `npm` incluido con la distribucion oficial de Node

## Motivo

`Node 22 LTS` ofrece un punto de equilibrio seguro para este stack:

- buena compatibilidad con el ecosistema actual de `Electron`;
- menor riesgo con dependencias nativas como `better-sqlite3`;
- base estable para herramientas modernas de frontend como `Vite`;
- soporte LTS adecuado para un proyecto desktop que necesita estabilidad antes que novedades.

## Por que no usar una version mas nueva

Aunque una version mas reciente de Node puede funcionar, no es la mejor opcion inicial para un proyecto Electron con modulos nativos. En este tipo de stack, usar la version LTS reduce friccion en:

- compilacion de dependencias nativas;
- scripts de build;
- compatibilidad con `electron-builder`;
- soporte del equipo a mediano plazo.

## Regla para el proyecto

Hasta que el proyecto este estabilizado, cualquier miembro del equipo debe trabajar con:

```text
Node.js 22 LTS
```

Si mas adelante el proyecto necesita cambiar de version, se debe registrar una nueva decision tecnica antes de actualizar el entorno.

## Nota operativa

Cuando terminemos el bootstrap del proyecto, conviene agregar alguno de estos archivos para fijar la version tambien en el repositorio:

- `.nvmrc`
- `.node-version`
- `package.json > engines`
