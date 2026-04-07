import { ipcMain } from 'electron'
import { settingsChannels } from '../../shared/ipc/settings'
import { getDb } from '../database/connection'
import { appendAppLogError } from '../logging/appLog'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import type { UpdateCashSettingsInput, UpdateSmtpSettingsInput } from '../../shared/types/settings'
import { SettingsService } from '../services/settingsService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerSettingsHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())
  const settingsService = new SettingsService(db)

  ipcMain.handle(settingsChannels.getSmtpSettings, () =>
    executeIpc(() => {
      guards.requireRole('admin')
      return settingsService.getSmtpSettingsPublic()
    }),
  )

  ipcMain.handle(settingsChannels.updateSmtpSettings, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requireRole('admin')
      settingsService.updateSmtpSettings(payload as UpdateSmtpSettingsInput)
    }),
  )

  ipcMain.handle(settingsChannels.testSmtp, () =>
    executeIpc(async () => {
      guards.requireRole('admin')
      const result = await settingsService.testSmtpConnection()
      if (!result.ok) {
        appendAppLogError('settings:testSmtp', new Error(result.message))
      }
      return result
    }),
  )

  ipcMain.handle(settingsChannels.getCashSettings, () =>
    executeIpc(() => {
      guards.requireUser()
      return settingsService.getCashSettingsPublic()
    }),
  )

  ipcMain.handle(settingsChannels.updateCashSettings, (_event, payload: unknown) =>
    executeIpc(() => {
      guards.requireRole('manager')
      settingsService.updateCashSettings(payload as UpdateCashSettingsInput)
    }),
  )
}
