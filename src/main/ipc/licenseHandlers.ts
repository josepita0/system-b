import { ipcMain } from 'electron'
import { licenseChannels } from '../../shared/ipc/license'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { LicenseService } from '../services/licenseService'
import { executeIpc } from './response'

export function registerLicenseHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const authorization = new AuthorizationService()
  const service = new LicenseService(db)

  ipcMain.handle(licenseChannels.getStatus, () =>
    executeIpc(() => {
      auth.requireCurrentUser()
      return service.getStatus()
    }),
  )

  ipcMain.handle(licenseChannels.getFeatureFlags, () =>
    executeIpc(() => {
      auth.requireCurrentUser()
      return service.getFeatureFlags()
    }),
  )

  ipcMain.handle(licenseChannels.validateSecretAccess, (_event, payload) =>
    executeIpc(() => {
      const actor = auth.requireCurrentUser()
      authorization.requirePermission(actor.permissions, 'license.manage')
      return service.validateSecretAccess(actor.id, payload)
    }),
  )

  ipcMain.handle(licenseChannels.activateByKey, (_event, payload) =>
    executeIpc(() => {
      const actor = auth.requireCurrentUser()
      authorization.requirePermission(actor.permissions, 'license.manage')
      return service.activateByKey(actor.id, payload)
    }),
  )

  ipcMain.handle(licenseChannels.activateManual, (_event, payload) =>
    executeIpc(() => {
      const actor = auth.requireCurrentUser()
      authorization.requirePermission(actor.permissions, 'license.manage')
      return service.activateManual(actor.id, payload)
    }),
  )

  ipcMain.handle(licenseChannels.renew, (_event, payload) =>
    executeIpc(() => {
      const actor = auth.requireCurrentUser()
      authorization.requirePermission(actor.permissions, 'license.manage')
      return service.renew(actor.id, payload)
    }),
  )

  ipcMain.handle(licenseChannels.cancel, (_event, payload) =>
    executeIpc(() => {
      const actor = auth.requireCurrentUser()
      authorization.requirePermission(actor.permissions, 'license.manage')
      return service.cancel(actor.id, payload)
    }),
  )
}
