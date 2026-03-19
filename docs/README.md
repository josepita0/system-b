# Documentacion del Proyecto

Este directorio centraliza la documentacion tecnica y operativa del proyecto `Sistema Local de Gestion de Barra`.

## Objetivo

Registrar cada decision importante y cada paso relevante de implementacion para que el proyecto sea mantenible, auditable y facil de retomar.

## Estructura inicial

- `decisions/`: decisiones tecnicas formales del proyecto.
- `setup/`: pasos de instalacion y configuracion del entorno.
- `implementation/`: bitacora de avances por modulo o sprint.

## Regla de trabajo

Cada cambio importante debe dejar al menos uno de estos registros:

- una decision tecnica, si cambia la arquitectura o una convención;
- una guia de setup, si agrega dependencias, herramientas o configuraciones;
- una nota de implementacion, si introduce un modulo o flujo critico.

## Primeros documentos sugeridos

- `decisions/0001-node-version.md`
- `setup/001-entorno-windows.md`
- `implementation/semana-1.md`

## Estado actual

Al cierre de la jornada actual, el proyecto ya cuenta con:

- stack base instalado y configurado;
- estructura `main`, `preload`, `shared` y `renderer`;
- base de datos SQLite con migraciones iniciales;
- primer CRUD funcional de productos;
- base de turnos, caja, reportes PDF y cola SMTP;
- pruebas iniciales pasando.

## Indice recomendado

### Decisiones

- `decisions/0001-node-version.md`: version oficial de Node para el proyecto.
- `decisions/0002-repositorio-privado-en-github.md`: estrategia inicial de publicacion y controles base en GitHub.
- `decisions/0003-patron-crud-navegable.md`: convencion base para CRUD administrativos con listado, acciones y pantallas separadas.

### Setup

- `setup/001-entorno-windows.md`: entorno instalado y dependencias base.
- `setup/002-comandos-del-proyecto.md`: comandos principales para desarrollo, pruebas y build.
- `setup/003-publicacion-segura-github.md`: alcance seguro del repositorio y checklist previo al primer commit.
- `setup/004-activacion-manual-github.md`: pasos para crear el repo privado y activar controles base cuando falte tooling local.

### Implementacion

- `implementation/semana-1.md`: resumen general del bootstrap tecnico.
- `implementation/2026-03-18-avances.md`: bitacora detallada de lo construido hoy.
- `implementation/2026-03-18-seguridad-usuarios.md`: capa de autenticacion, roles, sesiones y recuperacion.
- `implementation/2026-03-18-github-hardening.md`: deuda de seguridad detectada antes de publicar el repositorio.
