/**
 * Host fijo para URLs `catalog-media:`.
 * Con `registerSchemesAsPrivileged({ standard: true })`, Chromium exige un hostname no vacío;
 * si usábamos `catalog-media:///products/...`, el primer segmento se interpretaba como host y el
 * path quedaba mal (p. ej. solo `/12/foto.png`), rompiendo las imágenes en la tabla y el POS.
 */
export const CATALOG_MEDIA_URL_HOST = 'media'

/** URL para el protocolo registrado `catalog-media:` (solo Electron). */
export function catalogMediaUrl(relPath: string | null | undefined): string | null {
  if (relPath == null || !String(relPath).trim()) {
    return null
  }
  const normalized = String(relPath).replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized) {
    return null
  }
  const encoded = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `catalog-media://${CATALOG_MEDIA_URL_HOST}/${encoded}`
}

/**
 * Ruta relativa bajo la carpeta `catalog-media/` a partir de la URL recibida en `protocol.handle`
 * (incluye formatos antiguos mal parseados por Chromium).
 */
export function catalogRelativePathFromRequestUrl(requestUrl: string): string | null {
  let u: URL
  try {
    u = new URL(requestUrl)
  } catch {
    return null
  }
  if (u.protocol !== 'catalog-media:') {
    return null
  }

  const pathFromPathname = () => {
    const p = u.pathname.replace(/^[/\\]+/, '')
    return p || null
  }

  if (u.hostname === CATALOG_MEDIA_URL_HOST) {
    return pathFromPathname()
  }

  /** `catalog-media:///…` (sin host): el path completo va en pathname. */
  if (!u.hostname) {
    return pathFromPathname()
  }

  /**
   * Chromium podía normalizar `catalog-media:///products/…` a `catalog-media://products/…`,
   * dejando pathname como `/12/foto.png` en lugar de `/products/12/foto.png`.
   */
  if (u.hostname === 'products' || u.hostname === 'categories') {
    const tail = u.pathname.replace(/^[/\\]+/, '')
    if (!tail) {
      return null
    }
    return `${u.hostname}/${tail}`
  }

  return null
}
