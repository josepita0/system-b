import { app, BrowserWindow, dialog, globalShortcut, protocol } from 'electron'
import { licenseEvents } from '../shared/ipc/license'
import { getDb } from './database/connection'
import { runMigrations } from './database/migrate'
import { registerIpcHandlers } from './ipc'
import { AuthService } from './services/authService'
import { registerCatalogMediaProtocol } from './protocol/registerCatalogMediaProtocol'
import { createMainWindow } from './windows/createMainWindow'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'catalog-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

let mainWindow: BrowserWindow | null = null
/** Evita abrir una ventana sin IPC (p. ej. `activate` en macOS) si el arranque fallo antes de `registerIpcHandlers`. */
let bootstrapSucceeded = false
const LICENSE_PANEL_SHORTCUT = 'CommandOrControl+Alt+Shift+L'
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  dialog.showErrorBox(
    'Sistema Barra',
    'Ya hay una instancia en ejecucion. Cierre la otra ventana o el proceso en el administrador de tareas.',
  )
  app.quit()
}

let reportedFatalProcessError = false
function reportFatalProcessError(context: string, error: unknown) {
  if (reportedFatalProcessError) {
    return
  }
  reportedFatalProcessError = true
  const detail = error instanceof Error ? error.message : String(error)
  console.error(`[Sistema Barra] ${context}`, error)
  try {
    dialog.showErrorBox('Sistema Barra', `${context}\n\n${detail}`)
  } catch {
    // sin UI disponible
  }
  app.exit(1)
}

process.on('uncaughtException', (error) => {
  reportFatalProcessError('Error no controlado al iniciar:', error)
})

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

function showBootstrapError(error: unknown) {
  console.error('[Sistema Barra] Fallo al iniciar:', error)
  const detail = error instanceof Error ? error.message : String(error)
  dialog.showErrorBox(
    'Error al iniciar Sistema Barra',
    `No se pudo inicializar la base de datos o la aplicacion.\n\n${detail}\n\nRevise permisos de la carpeta de datos, espacio en disco y que no haya otro proceso usando la base.`,
  )
}

function runBootstrap() {
  const db = getDb()
  runMigrations(db)
  const auth = new AuthService(db)
  auth.ensureInitialAdmin()
  auth.ensureWizardAlignedWithBootstrap()
  registerIpcHandlers()
  mainWindow = createMainWindow()
  registerLicenseShortcut()
  bootstrapSucceeded = true
}

app.whenReady().then(() => {
  registerSecurityGuards()
  registerCatalogMediaProtocol()

  try {
    runBootstrap()
  } catch (error) {
    showBootstrapError(error)
    app.exit(1)
    return
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && bootstrapSucceeded) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (bootstrapSucceeded) {
      mainWindow = createMainWindow()
    }
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
