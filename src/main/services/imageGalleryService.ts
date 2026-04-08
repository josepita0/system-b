import fs from 'node:fs'
import path from 'node:path'
import { dialog } from 'electron'
import { getCatalogMediaDirectory } from '../catalogMedia/catalogMediaDirectory'
import { NotFoundError, ValidationError } from '../errors'
import type { GalleryImage, GalleryImageListParams, GalleryImageListResult, GalleryImageMetadataPatch } from '../../shared/types/imageGallery'
import { ImageRepository } from '../repositories/imageRepository'
import { ProductImageRepository } from '../repositories/productImageRepository'
import { ProductRepository } from '../repositories/productRepository'

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp'])

const imageMimeByExtension: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

function mediaRoot() {
  const root = getCatalogMediaDirectory()
  fs.mkdirSync(root, { recursive: true })
  return root
}

function normalizeRelPath(p: string) {
  return String(p).replace(/\\/g, '/').replace(/^\/+/, '')
}

function deleteRelFile(relPath: string) {
  const full = path.join(mediaRoot(), relPath)
  if (fs.existsSync(full) && fs.statSync(full).isFile()) {
    fs.unlinkSync(full)
  }
  const dir = path.dirname(full)
  try {
    fs.rmdirSync(dir)
  } catch {
    // carpeta no vacia o inexistente
  }
}

function listImageFilesInFolder(folderPath: string) {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const full = path.join(folderPath, entry.name)
    const ext = path.extname(full).toLowerCase()
    if (!imageExtensions.has(ext)) continue
    out.push(full)
  }
  return out
}

export class ImageGalleryService {
  constructor(
    private readonly images: ImageRepository,
    private readonly productImages: ProductImageRepository,
    private readonly products: ProductRepository,
  ) {}

  async pickFiles() {
    const picked = await dialog.showOpenDialog({
      title: 'Seleccionar imagenes',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    })
    if (picked.canceled || picked.filePaths.length === 0) {
      return []
    }
    return picked.filePaths
  }

  async pickFolder() {
    const picked = await dialog.showOpenDialog({
      title: 'Seleccionar carpeta de imagenes',
      properties: ['openDirectory'],
    })
    if (picked.canceled || picked.filePaths.length === 0) {
      return null
    }
    return picked.filePaths[0]
  }

  importImagesFromFiles(filePaths: string[]): GalleryImage[] {
    const created: GalleryImage[] = []
    for (const sourcePath of filePaths) {
      const extension = path.extname(sourcePath).toLowerCase()
      if (!imageExtensions.has(extension)) {
        throw new ValidationError('Solo se permiten imagenes PNG, JPEG o WEBP.')
      }
      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        throw new NotFoundError('Archivo no encontrado.')
      }

      const stats = fs.statSync(sourcePath)
      const originalName = path.basename(sourcePath)
      const mime = imageMimeByExtension[extension] ?? 'application/octet-stream'
      const tmpRel = normalizeRelPath(path.join('images', 'pending', `${Date.now()}-${Math.random()}-${originalName}`))
      const tmpFull = path.join(mediaRoot(), tmpRel)
      fs.mkdirSync(path.dirname(tmpFull), { recursive: true })
      fs.copyFileSync(sourcePath, tmpFull)

      const row = this.images.create({
        originalName,
        storedRelPath: tmpRel,
        mime,
        sizeBytes: stats.size,
        name: path.parse(originalName).name,
      })

      const destRel = normalizeRelPath(path.join('images', String(row.id), `${Date.now()}-${originalName}`))
      const destFull = path.join(mediaRoot(), destRel)
      fs.mkdirSync(path.dirname(destFull), { recursive: true })
      fs.renameSync(tmpFull, destFull)
      const updated = this.images.updateRelPath(row.id, destRel)
      created.push(updated)
    }
    return created
  }

  importImagesFromFolder(folderPath: string): GalleryImage[] {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new NotFoundError('Carpeta no encontrada.')
    }
    const files = listImageFilesInFolder(folderPath)
    return this.importImagesFromFiles(files)
  }

  listImages(params: GalleryImageListParams): GalleryImageListResult {
    return this.images.list(params)
  }

  updateImageMetadata(id: number, patch: GalleryImageMetadataPatch) {
    const existing = this.images.getById(id)
    if (!existing) {
      throw new NotFoundError('Imagen no encontrada.')
    }
    return this.images.patchMetadata(id, patch)
  }

  deleteImages(ids: number[]) {
    const unique = Array.from(new Set(ids.map((x) => Number(x)).filter((x) => Number.isFinite(x))))
    const rows = this.images.listByIds(unique)
    for (const img of rows) {
      deleteRelFile(img.storedRelPath)
    }
    this.images.deleteByIds(unique)
    return { deleted: rows.length }
  }

  linkImagesToProduct(productId: number, imageIds: number[], setPrimaryImageId?: number | null) {
    const product = this.products.getById(productId)
    if (!product || !product.isActive) {
      throw new NotFoundError('Producto no encontrado.')
    }
    const unique = Array.from(new Set(imageIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))))
    this.productImages.linkMany(productId, unique)
    if (setPrimaryImageId != null) {
      this.productImages.setPrimary(productId, setPrimaryImageId)
    }
  }

  unlinkImageFromProduct(productId: number, imageId: number) {
    this.productImages.unlink(productId, imageId)
  }

  setPrimaryProductImage(productId: number, imageId: number) {
    this.productImages.setPrimary(productId, imageId)
  }
}

