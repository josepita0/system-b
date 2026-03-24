import { app, BrowserWindow, globalShortcut } from 'electron'
import { licenseEvents } from '../shared/ipc/license'
import { getDb } from './database/connection'
import { runMigrations } from './database/migrate'
import { registerIpcHandlers } from './ipc'
import { AuthService } from './services/authService'
import { createMainWindow } from './windows/createMainWindow'

let mainWindow: BrowserWindow | null = null
const LICENSE_PANEL_SHORTCUT = 'CommandOrControl+Alt+Shift+L'
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
}

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

function registerSecurityGuards() {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-navigate', (event, navigationUrl) => {
      const currentUrl = contents.getURL()
      if (currentUrl && new URL(navigationUrl).origin !== new URL(currentUrl).origin) {
        event.preventDefault()
      }
    })
  })
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
  registerSecurityGuards()
  void bootstrap()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow()
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.focus()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
