import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { net, protocol } from 'electron'
import { getCatalogMediaDirectory } from '../catalogMedia/catalogMediaDirectory'

function isPathInsideMediaRoot(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(candidate)
  const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`
  if (process.platform === 'win32') {
    return resolved.toLowerCase().startsWith(prefix.toLowerCase())
  }
  return resolved.startsWith(prefix)
}

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return map[ext] ?? 'application/octet-stream'
}

function resolveUnderMediaRoot(urlPathname: string) {
  const decoded = decodeURIComponent(urlPathname)
  const relative = decoded.replace(/^[/\\]+/, '')
  if (!relative || relative.includes('..')) {
    return null
  }
  const root = path.resolve(getCatalogMediaDirectory())
  const full = path.resolve(path.join(root, relative))
  if (!isPathInsideMediaRoot(root, full)) {
    return null
  }
  return full
}

export function registerCatalogMediaProtocol() {
  protocol.handle('catalog-media', async (request) => {
    const pathname = new URL(request.url).pathname
    const full = resolveUnderMediaRoot(pathname)
    if (!full) {
      return new Response('Forbidden', { status: 403 })
    }
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      return new Response('Not found', { status: 404 })
    }

    const mime = mimeFor(full)
    try {
      const fetched = await net.fetch(pathToFileURL(full).href)
      if (fetched.ok) {
        return fetched
      }
    } catch (error) {
      console.warn('[catalog-media] net.fetch fallo, se sirve desde disco:', error)
    }

    const buffer = await fs.promises.readFile(full)
    return new Response(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buffer.length),
      },
    })
  })
}
