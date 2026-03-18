import { ipcMain } from 'electron'
import { shiftChannels } from '../../shared/ipc/shifts'
import { getDb } from '../database/connection'
import { ShiftRepository } from '../repositories/shiftRepository'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { ShiftService } from '../services/shiftService'
import { executeIpc } from './response'

export function registerShiftHandlers() {
  const db = getDb()
  const service = new ShiftService(new ShiftRepository(db))
  const auth = new AuthService(db)
  const authorization = new AuthorizationService()

  ipcMain.handle(shiftChannels.definitions, () =>
    executeIpc(() => {
      auth.requireCurrentUser()
      return service.definitions()
    }),
  )
  ipcMain.handle(shiftChannels.current, () =>
    executeIpc(() => {
      auth.requireCurrentUser()
      return service.current()
    }),
  )
  ipcMain.handle(shiftChannels.open, (_event, payload) =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'employee')
      return service.open(payload)
    }),
  )
  ipcMain.handle(shiftChannels.close, (_event, payload) =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
      return service.close(payload)
    }),
  )
}
