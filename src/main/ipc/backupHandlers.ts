import { dialog, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { backupChannels } from '../../shared/ipc/backup'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { BackupService } from '../services/backupService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerBackupHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())
  const backupService = new BackupService(db)

  ipcMain.handle(backupChannels.create, () =>
    executeIpc(async () => {
      guards.requireRole('admin')
      return backupService.createBackup()
    }),
  )

  ipcMain.handle(backupChannels.list, () =>
    executeIpc(() => {
      guards.requireRole('admin')
      return backupService.listBackups()
    }),
  )

  ipcMain.handle(backupChannels.restore, (_event, backupId: unknown) =>
    executeIpc(() => {
      guards.requireRole('admin')
      backupService.scheduleRestore(backupId as string)
    }),
  )

  ipcMain.handle(backupChannels.remove, (_event, backupId: unknown) =>
    executeIpc(() => {
      guards.requireRole('admin')
      backupService.removeBackup(backupId as string)
    }),
  )

  ipcMain.handle(backupChannels.export, async (_event, backupId: unknown) =>
    executeIpc(async () => {
      guards.requireRole('admin')
      const sourcePath = backupService.getBackupPath(backupId as string)
      const sourceFilename = path.basename(sourcePath)

      const result = await dialog.showSaveDialog({
        title: 'Exportar backup',
        defaultPath: sourceFilename,
        filters: [
          { name: 'Base de datos SQLite', extensions: ['sqlite', 'db'] },
          { name: 'Todos los archivos', extensions: ['*'] },
        ],
      })

      if (result.canceled || !result.filePath) {
        return { exported: false }
      }

      fs.copyFileSync(sourcePath, result.filePath)
      return { exported: true, path: result.filePath }
    }),
  )

  ipcMain.handle(backupChannels.import, async () =>
    executeIpc(async () => {
      guards.requireRole('admin')

      const result = await dialog.showOpenDialog({
        title: 'Importar backup',
        filters: [
          { name: 'Base de datos SQLite', extensions: ['sqlite', 'db'] },
          { name: 'Todos los archivos', extensions: ['*'] },
        ],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { imported: false }
      }

      const backup = backupService.importBackup(result.filePaths[0])
      return { imported: true, backup }
    }),
  )
}
