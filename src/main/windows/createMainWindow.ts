import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow } from 'electron'

function resolveRendererEntry() {
  return path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
}

/** Icono de ventana / barra de tareas en dev (`build/icon.png`). Tras `npm run build`, el .exe usa el mismo recurso vía electron-builder. */
function resolveWindowIcon(): string | undefined {
  const candidates = [
    path.join(app.getAppPath(), 'build', 'icon.png'),
    // dist-electron/src/main/windows -> raíz del repo (4 niveles)
    path.join(__dirname, '..', '..', '..', '..', 'build', 'icon.png'),
    path.join(process.cwd(), 'build', 'icon.png'),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return p
      }
    } catch {
      /* ignore */
    }
  }
  return undefined
}

export function createMainWindow() {
  const icon = resolveWindowIcon()
  const window = new BrowserWindow({
    ...(icon ? { icon } : {}),
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    void window.loadURL(devServerUrl)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    void window.loadFile(resolveRendererEntry())
  }

  return window
}
