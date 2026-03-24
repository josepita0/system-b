import { ipcMain } from 'electron'
import { shiftChannels } from '../../shared/ipc/shifts'
import { getDb } from '../database/connection'
import { ShiftRepository } from '../repositories/shiftRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { ShiftService } from '../services/shiftService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerShiftHandlers() {
  const db = getDb()
  const service = new ShiftService(new ShiftRepository(db))
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(shiftChannels.definitions, () =>
    executeIpc(() => {
      guards.requireUser()
      return service.definitions()
    }),
  )
  ipcMain.handle(shiftChannels.current, () =>
    executeIpc(() => {
      guards.requireUser()
      return service.current()
    }),
  )
  ipcMain.handle(shiftChannels.open, (_event, payload) =>
    executeIpc(() => {
      guards.requireRole('employee')
      return service.open(payload)
    }),
  )
  ipcMain.handle(shiftChannels.close, (_event, payload) =>
    executeIpc(() => {
      guards.requireRole('manager')
      return service.close(payload)
    }),
  )
}
