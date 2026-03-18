# Decision 0002: Repositorio privado y controles base en GitHub

## Estado

Aprobada

## Decision

La primera publicacion de `Sistema Barra` en GitHub debe hacerse en un repositorio privado.

Desde el primer dia, el repositorio debe activar estos controles:

- `Dependabot alerts`
- `Dependabot security updates`
- `Secret scanning`, si el plan disponible de GitHub lo soporta
- reglas basicas de rama para `main` cuando exista mas de una persona colaborando

## Motivo

El proyecto es una aplicacion de escritorio con datos operativos locales y credenciales transitorias generadas por el sistema. Aunque el codigo fuente no contiene secretos hardcodeados evidentes, una apertura prematura del repositorio aumentaria el riesgo de:

- publicar artefactos o datos locales por error;
- exponer decisiones de seguridad aun pendientes de endurecimiento;
- perder trazabilidad si el versionado se inicia sin controles minimos.

## Alcance

Esta decision no impide abrir el repositorio en el futuro. Solo fija la estrategia inicial:

1. publicar primero en privado;
2. completar el backlog de hardening;
3. reevaluar despues la apertura publica.

## Implementacion versionable

La parte del control que si vive dentro del repositorio es:

- `.gitignore`
- `.github/dependabot.yml`
- documentacion de publicacion segura y backlog de seguridad

La parte que se aplica desde la interfaz de GitHub y debe hacerse al crear el repo es:

- habilitar alertas de seguridad;
- habilitar actualizaciones automaticas;
- configurar protecciones de rama;
- revisar permisos de colaboradores.
