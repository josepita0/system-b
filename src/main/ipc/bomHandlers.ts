import { ipcMain } from 'electron'
import { bomChannels } from '../../shared/ipc/bom'
import { getDb } from '../database/connection'
import { BomRepository } from '../repositories/bomRepository'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { BomService } from '../services/bomService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'
import { ValidationError } from '../errors'

export function registerBomHandlers() {
  const db = getDb()
  const service = new BomService(new BomRepository(db), new ProductInventoryRepository(db))
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(bomChannels.getItems, (_event, parentProductId: unknown) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      const id = Number(parentProductId)
      if (!Number.isFinite(id) || id <= 0) {
        throw new ValidationError('Producto inválido.')
      }
      return service.getItems(id)
    }),
  )

  ipcMain.handle(bomChannels.upsert, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      return service.upsert(payload as never)
    }),
  )

  ipcMain.handle(bomChannels.removeAll, (_event, parentProductId: unknown) =>
    executeIpc(() => {
      guards.requirePermission('products.manage')
      const id = Number(parentProductId)
      if (!Number.isFinite(id) || id <= 0) {
        throw new ValidationError('Producto inválido.')
      }
      return service.removeAll(id)
    }),
  )

  ipcMain.handle(bomChannels.getVirtualStock, (_event, parentProductId: unknown) =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      const id = Number(parentProductId)
      if (!Number.isFinite(id) || id <= 0) {
        throw new ValidationError('Producto inválido.')
      }
      return service.getVirtualStock(id)
    }),
  )
}

