import { app, BrowserWindow, globalShortcut } from 'electron'
import { licenseEvents } from '../shared/ipc/license'
import { getDb } from './database/connection'
import { runMigrations } from './database/migrate'
import { registerIpcHandlers } from './ipc'
import { AuthService } from './services/authService'
import { createMainWindow } from './windows/createMainWindow'

let mainWindow: BrowserWindow | null = null
const LICENSE_PANEL_SHORTCUT = 'CommandOrControl+Alt+Shift+L'

function registerLicenseShortcut() {
  const registered = globalShortcut.register(LICENSE_PANEL_SHORTCUT, () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()
    mainWindow.webContents.send(licenseEvents.openAdminPanel)
  })

  if (!registered) {
    console.warn(`No se pudo registrar el atajo ${LICENSE_PANEL_SHORTCUT}.`)
  }
}

async function bootstrap() {
  const db = getDb()
  runMigrations(db)
  new AuthService(db).ensureInitialAdmin()
  registerIpcHandlers()
  mainWindow = createMainWindow()
  registerLicenseShortcut()
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
