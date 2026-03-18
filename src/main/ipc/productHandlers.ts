import { ipcMain } from 'electron'
import { productChannels } from '../../shared/ipc/products'
import { getDb } from '../database/connection'
import { ProductRepository } from '../repositories/productRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { ProductService } from '../services/productService'
import { executeIpc } from './response'

export function registerProductHandlers() {
  const db = getDb()
  const service = new ProductService(new ProductRepository(db))
  const auth = new AuthService(db)
  const authorization = new AuthorizationService()

  ipcMain.handle(productChannels.list, () =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
      return service.list()
    }),
  )
  ipcMain.handle(productChannels.getById, (_event, id: number) =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
      return service.getById(id)
    }),
  )
  ipcMain.handle(productChannels.create, (_event, payload) =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
      return service.create(payload)
    }),
  )
  ipcMain.handle(productChannels.update, (_event, payload) =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
      return service.update(payload)
    }),
  )
  ipcMain.handle(productChannels.remove, (_event, id: number) =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
      return service.remove(id)
    }),
  )
}
