# landing — Pagina de aterrizaje aislada

Pagina de ventas de una sola vista para el sistema de punto de venta
"system-barra" (la app de Electron + React del directorio raiz). Esta landing
es un proyecto Astro independiente e intencionalmente aislado: no comparte
dependencias, configuracion ni scripts con la app principal.

## Puesta en marcha

```bash
cd landing
npm install
npm run dev      # servidor de desarrollo
npm run build    # compilacion de produccion
npm run preview  # previsualizar el build
```

## Que reemplazar antes de publicar

- **Datos de contacto**: el correo `contacto@tu-dominio.com` y el texto del
  formulario en `src/components/Contacto.astro`.
- **Marca**: los textos "Tu marca" en `Header.astro`, `Footer.astro` y el
  monograma en `public/favicon.svg`.
- **Capturas**: los marcadores en `src/components/Capturas.astro` usan
  nombres de archivo planificados. Guarda las imagenes reales en
  `public/capturas/` (ver `public/capturas/README.md`).

## Personalizacion de marca (tokens)

Toda la identidad visual se define con variables CSS en
`src/styles/tokens.css` (color de acento, tipografia, paleta neutra).
Cambiar esas variables re-viste toda la pagina: es la demostracion fisica
de la personalizacion que ofrece el propio sistema.

## Stack

- Astro (estatico; unico JS de cliente: el formulario de demostracion)
- Tailwind CSS v4 (CSS-first, via `@tailwindcss/vite`, sin config JS)
- Sin frameworks de UI, sin backend.
