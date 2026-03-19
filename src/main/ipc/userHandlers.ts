import { ipcMain } from 'electron'
import { userChannels } from '../../shared/ipc/users'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { UserService } from '../services/userService'
import { executeIpc } from './response'

export function registerUserHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const service = new UserService(db, auth)

  ipcMain.handle(userChannels.list, () => executeIpc(() => service.list()))
  ipcMain.handle(userChannels.getById, (_event, userId: number) => executeIpc(() => service.getById(userId)))
  ipcMain.handle(userChannels.create, (_event, payload) => executeIpc(() => service.create(payload)))
  ipcMain.handle(userChannels.update, (_event, payload) => executeIpc(() => service.update(payload)))
  ipcMain.handle(userChannels.myProfile, () => executeIpc(() => service.myProfile()))
  ipcMain.handle(userChannels.issueCredentials, (_event, userId: number) =>
    executeIpc(() => service.issueCredentials(userId)),
  )
  ipcMain.handle(userChannels.regenerateRecoveryCodes, (_event, userId: number) =>
    executeIpc(() => service.regenerateRecoveryCodes(userId)),
  )
}
