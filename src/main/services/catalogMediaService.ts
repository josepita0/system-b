import fs from 'node:fs'
import path from 'node:path'
import { dialog, shell } from 'electron'
import { getCatalogMediaDirectory } from '../catalogMedia/catalogMediaDirectory'
import { AuthorizationError, NotFoundError, ValidationError } from '../errors'
import { writeOptimizedCatalogImage } from '../lib/catalogImageOptimize'
import { CategoryRepository } from '../repositories/categoryRepository'
import { ProductRepository } from '../repositories/productRepository'

const imageExtensions = new Set(['.png', '.jpg', '.jpeg'])
const pdfExtension = '.pdf'

function mediaRoot() {
  const root = getCatalogMediaDirectory()
  fs.mkdirSync(root, { recursive: true })
  return root
}

function deleteRelFile(relPath: string | null) {
  if (!relPath) {
    return
  }
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

export class CatalogMediaService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
  ) {}

  async setCategoryImage(categoryId: number) {
    const category = this.categories.getById(categoryId)
    if (!category || !category.isActive) {
      throw new NotFoundError('Categoria no encontrada.')
    }

    const picked = await dialog.showOpenDialog({
      title: 'Imagen de categoria',
      properties: ['openFile'],
      filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg'] }],
    })
    if (picked.canceled || picked.filePaths.length === 0) {
      throw new AuthorizationError('No se selecciono ningun archivo.')
    }

    const sourcePath = picked.filePaths[0]
    const extension = path.extname(sourcePath).toLowerCase()
    if (!imageExtensions.has(extension)) {
      throw new ValidationError('Solo se permiten imagenes PNG o JPEG.')
    }

    const { rel, mime } = await this.writeOptimizedImageIntoEntityFolder('categories', categoryId, sourcePath)
    deleteRelFile(category.imageRelPath)

    this.categories.patchMedia(categoryId, {
      imageRelPath: rel,
      imageMime: mime,
    })

    return this.categories.getById(categoryId)!
  }

  clearCategoryImage(categoryId: number) {
    const category = this.categories.getById(categoryId)
    if (!category || !category.isActive) {
      throw new NotFoundError('Categoria no encontrada.')
    }
    deleteRelFile(category.imageRelPath)
    this.categories.patchMedia(categoryId, { imageRelPath: null, imageMime: null })
    return this.categories.getById(categoryId)!
  }

  async setCategoryPdf(categoryId: number) {
    const category = this.categories.getById(categoryId)
    if (!category || !category.isActive) {
      throw new NotFoundError('Categoria no encontrada.')
    }

    const picked = await dialog.showOpenDialog({
      title: 'PDF de categoria',
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (picked.canceled || picked.filePaths.length === 0) {
      throw new AuthorizationError('No se selecciono ningun archivo.')
    }

    const sourcePath = picked.filePaths[0]
    const extension = path.extname(sourcePath).toLowerCase()
    if (extension !== pdfExtension) {
      throw new ValidationError('Solo se permiten archivos PDF.')
    }

    const rel = this.copyIntoEntityFolder('categories', categoryId, sourcePath)
    deleteRelFile(category.pdfRelPath)

    this.categories.patchMedia(categoryId, {
      pdfRelPath: rel,
      pdfMime: 'application/pdf',
      pdfOriginalName: path.basename(sourcePath),
    })

    return this.categories.getById(categoryId)!
  }

  clearCategoryPdf(categoryId: number) {
    const category = this.categories.getById(categoryId)
    if (!category || !category.isActive) {
      throw new NotFoundError('Categoria no encontrada.')
    }
    deleteRelFile(category.pdfRelPath)
    this.categories.patchMedia(categoryId, {
      pdfRelPath: null,
      pdfMime: null,
      pdfOriginalName: null,
    })
    return this.categories.getById(categoryId)!
  }

  async setProductImage(productId: number) {
    const product = this.products.getById(productId)
    if (!product || !product.isActive) {
      throw new NotFoundError('Producto no encontrado.')
    }

    const picked = await dialog.showOpenDialog({
      title: 'Imagen de producto',
      properties: ['openFile'],
      filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg'] }],
    })
    if (picked.canceled || picked.filePaths.length === 0) {
      throw new AuthorizationError('No se selecciono ningun archivo.')
    }

    const sourcePath = picked.filePaths[0]
    const extension = path.extname(sourcePath).toLowerCase()
    if (!imageExtensions.has(extension)) {
      throw new ValidationError('Solo se permiten imagenes PNG o JPEG.')
    }

    const { rel, mime } = await this.writeOptimizedImageIntoEntityFolder('products', productId, sourcePath)
    deleteRelFile(product.imageRelPath)

    this.products.patchMedia(productId, {
      imageRelPath: rel,
      imageMime: mime,
    })

    return this.products.getById(productId)!
  }

  clearProductImage(productId: number) {
    const product = this.products.getById(productId)
    if (!product || !product.isActive) {
      throw new NotFoundError('Producto no encontrado.')
    }
    deleteRelFile(product.imageRelPath)
    this.products.patchMedia(productId, { imageRelPath: null, imageMime: null })
    return this.products.getById(productId)!
  }

  async setProductPdf(productId: number) {
    const product = this.products.getById(productId)
    if (!product || !product.isActive) {
      throw new NotFoundError('Producto no encontrado.')
    }

    const picked = await dialog.showOpenDialog({
      title: 'PDF de producto',
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (picked.canceled || picked.filePaths.length === 0) {
      throw new AuthorizationError('No se selecciono ningun archivo.')
    }

    const sourcePath = picked.filePaths[0]
    const extension = path.extname(sourcePath).toLowerCase()
    if (extension !== pdfExtension) {
      throw new ValidationError('Solo se permiten archivos PDF.')
    }

    const rel = this.copyIntoEntityFolder('products', productId, sourcePath)
    deleteRelFile(product.pdfRelPath)

    this.products.patchMedia(productId, {
      pdfRelPath: rel,
      pdfMime: 'application/pdf',
      pdfOriginalName: path.basename(sourcePath),
    })

    return this.products.getById(productId)!
  }

  clearProductPdf(productId: number) {
    const product = this.products.getById(productId)
    if (!product || !product.isActive) {
      throw new NotFoundError('Producto no encontrado.')
    }
    deleteRelFile(product.pdfRelPath)
    this.products.patchMedia(productId, {
      pdfRelPath: null,
      pdfMime: null,
      pdfOriginalName: null,
    })
    return this.products.getById(productId)!
  }

  openPdfByRelPath(relPath: string | null) {
    if (!relPath?.trim()) {
      throw new ValidationError('No hay PDF asociado.')
    }
    const full = path.join(mediaRoot(), relPath)
    if (!fs.existsSync(full)) {
      throw new NotFoundError('El archivo ya no existe en disco.')
    }
    void shell.openPath(full)
  }

  purgeCategoryFiles(categoryId: number) {
    const category = this.categories.getById(categoryId)
    if (!category) {
      return
    }
    deleteRelFile(category.imageRelPath)
    deleteRelFile(category.pdfRelPath)
    this.categories.patchMedia(categoryId, {
      imageRelPath: null,
      imageMime: null,
      pdfRelPath: null,
      pdfMime: null,
      pdfOriginalName: null,
    })
  }

  purgeProductFiles(productId: number) {
    const product = this.products.getById(productId)
    if (!product) {
      return
    }
    deleteRelFile(product.imageRelPath)
    deleteRelFile(product.pdfRelPath)
    this.products.patchMedia(productId, {
      imageRelPath: null,
      imageMime: null,
      pdfRelPath: null,
      pdfMime: null,
      pdfOriginalName: null,
    })
  }

  private copyIntoEntityFolder(entity: 'categories' | 'products', entityId: number, sourcePath: string) {
    const destDir = path.join(mediaRoot(), entity, String(entityId))
    fs.mkdirSync(destDir, { recursive: true })
    const baseName = path.basename(sourcePath)
    const destPath = path.join(destDir, `${Date.now()}-${baseName}`)
    fs.copyFileSync(sourcePath, destPath)
    return path.join(entity, String(entityId), path.basename(destPath)).replace(/\\/g, '/')
  }

  private async writeOptimizedImageIntoEntityFolder(
    entity: 'categories' | 'products',
    entityId: number,
    sourcePath: string,
  ): Promise<{ rel: string; mime: string }> {
    const destDir = path.join(mediaRoot(), entity, String(entityId))
    const base = `${Date.now()}-img`
    const { fullPath, mime } = await writeOptimizedCatalogImage(sourcePath, destDir, base)
    const rel = path.join(entity, String(entityId), path.basename(fullPath)).replace(/\\/g, '/')
    return { rel, mime }
  }
}
