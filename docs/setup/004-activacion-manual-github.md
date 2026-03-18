# Setup 004: Activacion manual del repositorio en GitHub

## Objetivo

Dejar documentado el paso a paso para crear el repositorio privado y activar los controles base cuando el entorno local no tenga `git` o `gh` disponibles.

## Pasos

1. Instalar `Git for Windows`.
2. Crear un repositorio nuevo en GitHub con visibilidad `Private`.
3. No agregar `README`, `.gitignore` ni licencia desde GitHub si ya existen localmente.
4. Habilitar `Dependabot alerts` y `Dependabot security updates`.
5. Habilitar `Secret scanning` si el plan de GitHub lo soporta.
6. Definir proteccion minima para la rama `main` cuando empiece la colaboracion:
   - pull request obligatorio;
   - al menos una revision;
   - bloquear pushes directos si el flujo del equipo lo requiere.

## Archivos ya preparados en este proyecto

- `.gitignore`
- `.github/dependabot.yml`
- `scripts/preflight-github.ps1`
- `docs/implementation/2026-03-18-github-hardening.md`

## Secuencia local recomendada

Cuando `git` este disponible en la maquina:

```bash
git init
git add .
git status
git commit -m "Initialize repository for secure GitHub onboarding"
git branch -M main
git remote add origin <URL_DEL_REPO_PRIVADO>
git push -u origin main
```

## Nota

Si el proyecto va a abrirse al publico mas adelante, primero debe completarse el backlog de hardening documentado en `docs/implementation/2026-03-18-github-hardening.md`.
