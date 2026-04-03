# Setup 005: Git y credenciales (higiene de seguridad)

## Objetivo

Evitar que **tokens o contraseñas** queden expuestos en remotes de Git, historial local o capturas de pantalla.

## Reglas

1. **Nunca** usar URLs de remoto con token embebido (`https://...@github.com/...`). Usar SSH (`git@github.com:org/repo.git`) o el helper de credenciales del sistema.
2. Si un token se filtró en un remote local: **revocar** el token en GitHub de inmediato y crear uno nuevo.
3. Tras rotar, actualizar el remote:
   ```bash
   git remote set-url origin git@github.com:ORG/REPO.git
   ```
4. Revisar que no queden credenciales en:
   - `.git/config`
   - historial de terminal compartido
   - documentación o issues públicos

## SMTP y secretos de la app

No versionar contraseñas SMTP. Preferir:

- variable de entorno `SYSTEM_BARRA_SMTP_PASSWORD`, o
- valor cifrado `enc:` en base (generado desde la UI de Reportes en la app).

Ver `docs/pilot/04-smtp-operacion.md`.

## Sesiones locales

La persistencia de sesión puede usar `safeStorage` de Electron cuando está disponible.

Ver `docs/implementation/2026-03-18-github-hardening.md`.
