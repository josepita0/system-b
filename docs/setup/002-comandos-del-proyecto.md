# Setup 002: Comandos del proyecto

## Objetivo

Tener una referencia rapida de los comandos base para desarrollo, validacion y build.

## Comandos principales

### Desarrollo

```bash
npm run dev
```

Levanta:

- rebuild de `better-sqlite3` para `Electron`;
- `Vite` para el renderer;
- compilacion en watch del proceso principal;
- apertura de `Electron` apuntando al servidor local.

### Verificacion de tipos

```bash
npm run typecheck
```

Valida TypeScript en:

- renderer;
- main process;
- preload;
- modulos compartidos.

### Pruebas

```bash
npm test
```

Ejecuta la suite actual de `Vitest` para:

- rebuild de `better-sqlite3` para `Node`;
- migraciones;
- CRUD de productos;
- reglas de turnos.

### Rebuild nativo para Electron

```bash
npm run native:electron
```

Recompila `better-sqlite3` para el runtime de `Electron`.

### Rebuild nativo para Node

```bash
npm run native:node
```

Recompila `better-sqlite3` para el runtime de `Node`, usado por las pruebas.

### Build del main

```bash
npm run build:main
```

Compila el proceso principal, preload y modulos compartidos a `dist-electron`.

### Build del renderer

```bash
npm run build:renderer
```

Genera la salida del frontend en `dist/renderer`.

### Build completo

```bash
npm run build
```

Ejecuta:

1. compilacion del main;
2. compilacion del renderer;
3. empaquetado con `electron-builder`.

## Scripts definidos

Los scripts viven en `package.json` y actualmente incluyen:

- `dev`
- `native:electron`
- `native:node`
- `dev:renderer`
- `dev:main`
- `dev:electron`
- `build`
- `build:main`
- `build:renderer`
- `typecheck`
- `test`
- `test:watch`

## Nota operativa

Si se desea ejecutar el proyecto en una maquina nueva, primero instalar dependencias:

```bash
npm install
```

En este proyecto `better-sqlite3` necesita compilarse contra dos runtimes distintos:

- `Electron` para ejecutar la app desktop;
- `Node` para ejecutar pruebas locales.

Por eso los scripts `dev` y `test` ya incorporan el rebuild correspondiente automaticamente.
