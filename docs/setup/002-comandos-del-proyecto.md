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

Compila el proceso principal, preload y modulos compartidos a `dist-electron`, y copia las migraciones `.sql` a `dist-electron/src/main/database/migrations` (necesario para la app empaquetada).

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
3. `native:electron` (recompila `better-sqlite3` para el ABI de Electron antes del empaquetado);
4. empaquetado **portable** (`Sistema Barra <version>.exe` en `dist/`), sin instalador NSIS.

El instalador clásico **Setup** (NSIS) puede fallar al compilar en algunos equipos Windows con `failed creating mmap` (herramienta `makensis` + archivo embebido; a menudo mejora excluyendo la carpeta del proyecto del analisis en tiempo real de Defender). Para intentar solo el Setup:

```bash
npm run build:installer
```

No se debe activar `useZip` en la seccion `nsis` de `electron-builder.yml`: en instalacion suele producir "Error opening ZIP file" al descomprimir. El empaquetado interno correcto es el predeterminado (7z).

Tras `npm install` se ejecuta `postinstall` (`electron-builder install-app-deps`) para alinear dependencias nativas con la version de Electron del proyecto.

## Scripts definidos

Los scripts viven en `package.json` y actualmente incluyen:

- `dev`
- `postinstall`
- `native:electron`
- `native:node`
- `dev:renderer`
- `dev:main`
- `dev:electron`
- `build`
- `build:installer`
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
