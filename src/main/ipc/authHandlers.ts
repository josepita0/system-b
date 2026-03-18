import { ipcMain } from 'electron'
import { authChannels } from '../../shared/ipc/auth'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { executeIpc } from './response'

export function registerAuthHandlers() {
  const service = new AuthService(getDb())

  ipcMain.handle(authChannels.login, (_event, payload) => executeIpc(() => service.login(payload)))
  ipcMain.handle(authChannels.logout, () => executeIpc(() => service.logout()))
  ipcMain.handle(authChannels.me, () =>
    executeIpc(() => {
      const user = service.getCurrentUser()
      return user ? { user } : null
    }),
  )
  ipcMain.handle(authChannels.recoverPassword, (_event, payload) => executeIpc(() => service.recoverPassword(payload)))
  ipcMain.handle(authChannels.bootstrapInfo, () => executeIpc(() => service.getBootstrapInfo()))
}
