import { ipcMain } from 'electron'
import { internalConsumptionChannels } from '../../shared/ipc/internalConsumptions'
import { getDb } from '../database/connection'
import { InternalConsumptionRepository } from '../repositories/internalConsumptionRepository'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { ShiftRepository } from '../repositories/shiftRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { InternalConsumptionService } from '../services/internalConsumptionService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'
import { ValidationError } from '../errors'

export function registerInternalConsumptionHandlers() {
  const db = getDb()
  const shifts = new ShiftRepository(db)
  const docs = new InternalConsumptionRepository(db)
  const inventory = new ProductInventoryRepository(db)
  const service = new InternalConsumptionService(shifts, docs, inventory)
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(internalConsumptionChannels.create, (_event, payload: unknown) =>
    executeIpc(() => {
      const actor = guards.requirePermission('internal_consumption.create')
      return service.create(payload as never, actor.id)
    }),
  )

  ipcMain.handle(internalConsumptionChannels.getById, (_event, id: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.view')
      const n = Number(id)
      if (!Number.isFinite(n) || n <= 0) {
        throw new ValidationError('ID inválido.')
      }
      return service.getById(n)
    }),
  )

  ipcMain.handle(internalConsumptionChannels.listPaged, (_event, params: unknown) =>
    executeIpc(() => {
      guards.requirePermission('inventory.view')
      return service.listPaged(params)
    }),
  )

  ipcMain.handle(internalConsumptionChannels.cancel, (_event, payload: unknown) =>
    executeIpc(() => {
      const actor = guards.requireRole('manager')
      if (!payload || typeof payload !== 'object') {
        throw new ValidationError('Parámetros inválidos.')
      }
      return service.cancel(payload as never, actor.id)
    }),
  )
}

