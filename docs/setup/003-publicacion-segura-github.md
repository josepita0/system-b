# Setup 003: Publicacion segura en GitHub

## Objetivo

Definir el alcance exacto del repositorio y el checklist minimo antes de subir `Sistema Barra` a GitHub.

## Contenido que si entra al repositorio

Versionar:

- `src/`
- `tests/`
- `docs/`
- `scripts/`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.node.json`
- `tsconfig.electron.json`
- `vite.config.ts`
- `vitest.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`
- `electron-builder.yml`
- `index.html`
- `doc_arquitectura_barra.md`
- `.github/`
- `.gitignore`

## Contenido que no debe versionarse

Excluir del repositorio:

- `node_modules/`
- `dist/`
- `dist-electron/`
- `.data/`
- bases locales `*.db`, `*.sqlite`, `*.sqlite3`
- estado de sesion `current-session.json`
- llaves locales `app.key`
- credenciales bootstrap `initial-admin-access.json`
- variables locales `.env*`
- logs, temporales y configuraciones locales de IDE

## Motivo tecnico

Este proyecto mezcla codigo versionable con datos operativos del runtime local:

- `src/main/database/connection.ts` define un directorio de datos local;
- `src/main/security/sessionStorage.ts` persiste la sesion actual;
- `src/main/security/encryption.ts` genera y guarda `app.key`;
- `src/main/services/authService.ts` puede escribir `initial-admin-access.json`.

Nada de eso debe formar parte del repositorio.

## Checklist antes del primer commit

1. Confirmar que el directorio del proyecto no contenga bases SQLite ni archivos operativos locales.
2. Confirmar que `.gitignore` cubra artefactos de build, datos locales, sesiones y llaves.
3. Revisar que la documentacion no exponga contrasenas temporales, codigos de recuperacion ni capturas sensibles.
4. Crear el repositorio inicialmente como privado.
5. Habilitar alertas de dependencias y secret scanning desde GitHub cuando el repositorio exista.

## Preflight automatizable

El repositorio incluye:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\preflight-github.ps1
```

Este script revisa el arbol versionable y falla si detecta bases locales, llaves, sesiones o archivos `.env` dentro del workspace que se va a publicar.

## Nota operativa

Si `SYSTEM_BARRA_DATA_DIR` se define manualmente en desarrollo, debe apuntar a una ruta fuera del arbol versionado del proyecto.
