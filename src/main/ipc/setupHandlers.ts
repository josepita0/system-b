import { ipcMain } from 'electron'
import { setupChannels } from '../../shared/ipc/setup'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { SetupService } from '../services/setupService'
import { executeIpc } from './response'

export function registerSetupHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const service = new SetupService(db)

  ipcMain.handle(setupChannels.getStatus, () => executeIpc(() => service.getStatus()))
  ipcMain.handle(setupChannels.complete, () =>
    executeIpc(() => {
      const actor = auth.requireCurrentUser()
      return service.complete(actor.id)
    }),
  )
}
