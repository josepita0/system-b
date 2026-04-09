import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const MAX_EDGE = 1400
const JPEG_QUALITY = 82

export type OptimizedImageResult = { fullPath: string; mime: string }

/**
 * Escribe una versión optimizada para catálogo/POS: redimensiona, JPEG con calidad fija
 * o PNG si el origen tiene canal alpha.
 */
export async function writeOptimizedCatalogImage(
  sourcePath: string,
  destDir: string,
  baseNameWithoutExt: string,
): Promise<OptimizedImageResult> {
  await fs.promises.mkdir(destDir, { recursive: true })

  const meta = await sharp(sourcePath, { failOn: 'none' }).metadata()
  const hasAlpha = Boolean(meta.hasAlpha)

  if (hasAlpha) {
    const fullPath = path.join(destDir, `${baseNameWithoutExt}.png`)
    await sharp(sourcePath)
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(fullPath)
    return { fullPath, mime: 'image/png' }
  }

  const fullPath = path.join(destDir, `${baseNameWithoutExt}.jpg`)
  await sharp(sourcePath)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(fullPath)
  return { fullPath, mime: 'image/jpeg' }
}
