import { ipcMain } from 'electron'
import { searchPagedInputSchema } from '../../shared/schemas/paginationSchema'
import { vipCustomerChannels } from '../../shared/ipc/vipCustomers'
import { getDb } from '../database/connection'
import { VipCustomerRepository } from '../repositories/vipCustomerRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { VipCustomerService } from '../services/vipCustomerService'
import { ValidationError } from '../errors'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerVipCustomerHandlers() {
  const db = getDb()
  const service = new VipCustomerService(new VipCustomerRepository(db))
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(vipCustomerChannels.list, () =>
    executeIpc(() => {
      guards.requirePermission('vip.manage')
      return service.list()
    }),
  )

  ipcMain.handle(vipCustomerChannels.listPaged, (_event, raw: unknown) =>
    executeIpc(() => {
      guards.requirePermission('vip.manage')
      const p = searchPagedInputSchema.parse(raw ?? {})
      return service.listPaged(p.page, p.pageSize, p.search)
    }),
  )

  ipcMain.handle(vipCustomerChannels.listActive, () =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      return service.list()
    }),
  )

  ipcMain.handle(vipCustomerChannels.getById, (_event, id: unknown) =>
    executeIpc(() => {
      guards.requirePermission('vip.manage')
      if (typeof id !== 'number' || Number.isNaN(id)) {
        throw new ValidationError('Id invalido.')
      }
      return service.getById(id)
    }),
  )

  ipcMain.handle(vipCustomerChannels.create, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('vip.manage')
      return service.create(payload)
    }),
  )

  ipcMain.handle(vipCustomerChannels.update, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requirePermission('vip.manage')
      return service.update(payload)
    }),
  )

  ipcMain.handle(vipCustomerChannels.remove, (_event, id: unknown) =>
    executeIpc(() => {
      guards.requirePermission('vip.manage')
      if (typeof id !== 'number' || Number.isNaN(id)) {
        throw new ValidationError('Id invalido.')
      }
      service.remove(id)
    }),
  )
}

