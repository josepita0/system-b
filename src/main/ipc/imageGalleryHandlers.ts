import { ipcMain } from 'electron'
import { imageGalleryChannels } from '../../shared/ipc/imageGallery'
import { getDb } from '../database/connection'
import { ImageRepository } from '../repositories/imageRepository'
import { ProductImageRepository } from '../repositories/productImageRepository'
import { ProductRepository } from '../repositories/productRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { ImageGalleryService } from '../services/imageGalleryService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerImageGalleryHandlers() {
  const db = getDb()
  const images = new ImageRepository(db)
  const productImages = new ProductImageRepository(db)
  const products = new ProductRepository(db)
  const gallery = new ImageGalleryService(images, productImages, products)

  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(imageGalleryChannels.pickFiles, () =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return gallery.pickFiles()
    }),
  )

  ipcMain.handle(imageGalleryChannels.pickFolder, () =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return gallery.pickFolder()
    }),
  )

  ipcMain.handle(imageGalleryChannels.importFiles, (_event, filePaths: string[]) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return gallery.importImagesFromFiles(filePaths ?? [])
    }),
  )

  ipcMain.handle(imageGalleryChannels.importFolder, (_event, folderPath: string) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return gallery.importImagesFromFolder(folderPath)
    }),
  )

  ipcMain.handle(imageGalleryChannels.list, (_event, params) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return gallery.listImages(params ?? {})
    }),
  )

  ipcMain.handle(imageGalleryChannels.updateMetadata, (_event, id: number, patch) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return gallery.updateImageMetadata(id, patch ?? {})
    }),
  )

  ipcMain.handle(imageGalleryChannels.deleteBatch, (_event, ids: number[]) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return gallery.deleteImages(ids ?? [])
    }),
  )

  ipcMain.handle(imageGalleryChannels.linkToProduct, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      gallery.linkImagesToProduct(payload.productId, payload.imageIds ?? [], payload.setPrimaryImageId ?? null)
      return { success: true as const }
    }),
  )

  ipcMain.handle(imageGalleryChannels.unlinkFromProduct, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      gallery.unlinkImageFromProduct(payload.productId, payload.imageId)
      return { success: true as const }
    }),
  )

  ipcMain.handle(imageGalleryChannels.setPrimaryForProduct, (_event, payload) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      gallery.setPrimaryProductImage(payload.productId, payload.imageId)
      return { success: true as const }
    }),
  )
}

