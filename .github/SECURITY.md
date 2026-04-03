# Politica de seguridad

## Alcance actual

Este proyecto se prepara para una publicacion inicial en un repositorio privado.

Hasta completar el backlog de hardening documentado en `docs/implementation/2026-03-18-github-hardening.md`, no se recomienda abrirlo al publico.

## Reporte de vulnerabilidades

Si detectas una vulnerabilidad o una exposicion de datos:

1. no abras un issue publico con detalles sensibles;
2. comunica el hallazgo por un canal privado del equipo;
3. adjunta pasos de reproduccion y archivos afectados;
4. confirma si el hallazgo compromete credenciales locales, sesiones o datos exportados.

## Riesgos conocidos en seguimiento

- exposicion del acceso inicial de administrador via `bootstrapInfo`;
- persistencia local de sesion: mitigacion parcial con `safeStorage` cuando el SO lo permite (ver `src/main/security/sessionStorage.ts`);
- manejo local de `app.key`;
- almacenamiento de `smtp_password` en la base local: mitigar con `enc:` y/o `SYSTEM_BARRA_SMTP_PASSWORD` (ver `docs/pilot/04-smtp-operacion.md`);
- `Content-Security-Policy` definida en `index.html` (ajustar si se agregan origenes externos);
- evaluacion pendiente de `sandbox: true` en Electron (ver `src/main/windows/createMainWindow.ts`);
- **tokens en URL de `git remote`**: rotar y usar SSH o credential helper — ver `docs/setup/005-git-credenciales.md`.
