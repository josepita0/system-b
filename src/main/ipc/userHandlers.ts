import { ipcMain } from 'electron'
import { userChannels } from '../../shared/ipc/users'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { UserService } from '../services/userService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerUserHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth)
  const service = new UserService(db)

  ipcMain.handle(userChannels.list, () => executeIpc(() => service.list(guards.requirePermission('users.manage_profiles'))))
  ipcMain.handle(userChannels.getById, (_event, userId: number) =>
    executeIpc(() => service.getById(guards.requirePermission('users.manage_profiles'), userId)),
  )
  ipcMain.handle(userChannels.create, (_event, payload) =>
    executeIpc(() => service.create(guards.requirePermission('users.manage_profiles'), payload)),
  )
  ipcMain.handle(userChannels.update, (_event, payload) =>
    executeIpc(() => service.update(guards.requirePermission('users.manage_profiles'), payload)),
  )
  ipcMain.handle(userChannels.myProfile, () => executeIpc(() => service.myProfile(guards.requireUser())))
  ipcMain.handle(userChannels.issueCredentials, (_event, userId: number) =>
    executeIpc(() =>
      service.issueCredentials(guards.requirePermission('users.manage_credentials'), userId, (targetUserId, actorId) =>
        auth.replaceRecoveryCodes(targetUserId, actorId),
      ),
    ),
  )
  ipcMain.handle(userChannels.regenerateRecoveryCodes, (_event, userId: number) =>
    executeIpc(() =>
      service.regenerateRecoveryCodes(guards.requirePermission('users.manage_credentials'), userId, (targetUserId, actorId) =>
        auth.replaceRecoveryCodes(targetUserId, actorId),
      ),
    ),
  )
}
