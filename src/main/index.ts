import { app, BrowserWindow } from 'electron'
import { getDb } from './database/connection'
import { runMigrations } from './database/migrate'
import { registerIpcHandlers } from './ipc'
import { AuthService } from './services/authService'
import { createMainWindow } from './windows/createMainWindow'

let mainWindow: BrowserWindow | null = null

async function bootstrap() {
  const db = getDb()
  runMigrations(db)
  new AuthService(db).ensureInitialAdmin()
  registerIpcHandlers()
  mainWindow = createMainWindow()
}

app.whenReady().then(() => {
  void bootstrap()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
