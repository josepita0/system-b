import { ipcMain } from 'electron'
import { licenseChannels } from '../../shared/ipc/license'
import { generateLicensePanelCodeSchema } from '../../shared/schemas/licenseSchema'
import { getDb } from '../database/connection'
import { ValidationError } from '../errors'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { LicenseService } from '../services/licenseService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerLicenseHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())
  const service = new LicenseService(db)

  ipcMain.handle(licenseChannels.getStatus, () =>
    executeIpc(() => {
      guards.requireUser()
      return service.getStatus()
    }),
  )

  ipcMain.handle(licenseChannels.getFeatureFlags, () =>
    executeIpc(() => {
      guards.requireUser()
      return service.getFeatureFlags()
    }),
  )

  ipcMain.handle(licenseChannels.generatePanelAccessCode, (_event, payload) =>
    executeIpc(() => {
      const actor = guards.requireRole('admin')
      const parsed = generateLicensePanelCodeSchema.safeParse(payload)
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
      }
      return service.generateTemporaryPanelCode(actor.id, parsed.data.targetEmployeeId)
    }),
  )

  ipcMain.handle(licenseChannels.validateSecretAccess, (_event, payload) =>
    executeIpc(() => {
      const actor = guards.requirePermission('license.manage')
      return service.validateSecretAccess(actor.id, payload)
    }),
  )

  ipcMain.handle(licenseChannels.activateByKey, (_event, payload) =>
    executeIpc(() => {
      const actor = guards.requirePermission('license.manage')
      return service.activateByKey(actor.id, payload)
    }),
  )

  ipcMain.handle(licenseChannels.activateManual, (_event, payload) =>
    executeIpc(() => {
      const actor = guards.requirePermission('license.manage')
      return service.activateManual(actor.id, payload)
    }),
  )

  ipcMain.handle(licenseChannels.renew, (_event, payload) =>
    executeIpc(() => {
      const actor = guards.requirePermission('license.manage')
      return service.renew(actor.id, payload)
    }),
  )

  ipcMain.handle(licenseChannels.cancel, (_event, payload) =>
    executeIpc(() => {
      const actor = guards.requirePermission('license.manage')
      return service.cancel(actor.id, payload)
    }),
  )
}
