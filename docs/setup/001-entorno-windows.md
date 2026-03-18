# Setup 001: Entorno Windows base

## Estado

Aplicado

## Versiones fijadas

- Node.js `22.22.1`
- npm `11.11.1`

## Paquetes instalados

### Runtime

- `electron`
- `react`
- `react-dom`
- `better-sqlite3`
- `zod`
- `date-fns`
- `nodemailer`
- `pdf-lib`
- `react-router-dom`
- `@tanstack/react-query`
- `zustand`

### Desarrollo

- `typescript`
- `vite`
- `@vitejs/plugin-react`
- `tailwindcss`
- `@tailwindcss/postcss`
- `postcss`
- `autoprefixer`
- `electron-builder`
- `vitest`
- `@playwright/test`
- `concurrently`
- `wait-on`
- `cross-env`

## Resultado

El workspace ya dispone del stack base para:

- renderer en React con Vite;
- proceso principal de Electron en TypeScript;
- SQLite local con `better-sqlite3`;
- empaquetado Windows con `electron-builder`;
- pruebas iniciales con `vitest`.

## Estructura tecnica aplicada

La estructura base ya implementada es:

- `src/main`: proceso principal, servicios, repositorios, IPC y base de datos.
- `src/preload`: puente seguro expuesto al renderer mediante `contextBridge`.
- `src/shared`: tipos, contratos IPC y esquemas compartidos.
- `src/renderer`: interfaz React, paginas, componentes y estado de UI.
- `tests`: pruebas de migraciones, productos y turnos.

## Validaciones realizadas

Durante el bootstrap quedaron validados:

- `npm run typecheck`
- `npm test`
- `npm run build:main`
- `npm run build:renderer`

## Observaciones importantes

- `Electron` queda en `devDependencies`, como espera `electron-builder`.
- La entrada principal del empaquetado apunta a `dist-electron/src/main/index.js`.
- La base local usa `SQLite` con `WAL` y `foreign_keys = ON`.
