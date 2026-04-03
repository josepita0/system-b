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
  return `catalog-media:///${encoded}`
}
