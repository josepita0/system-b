import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow } from 'electron'

function resolveRendererEntry() {
  return path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
}

/**
 * Icono de la ventana (y coherente con favicon).
 * En producción el PNG está en el asar: `dist/renderer/icon.png` (viene de `public/`).
 * En desarrollo: `public/icon.png` o `build/icon.png` tras `npm run sync:app-icon`.
 */
function resolveWindowIcon(): string | undefined {
  const candidates = [
    path.join(app.getAppPath(), 'dist', 'renderer', 'icon.png'),
    path.join(__dirname, '..', '..', '..', '..', 'dist', 'renderer', 'icon.png'),
    path.join(__dirname, '..', '..', '..', '..', 'public', 'icon.png'),
    path.join(process.cwd(), 'dist', 'renderer', 'icon.png'),
    path.join(process.cwd(), 'public', 'icon.png'),
    path.join(process.cwd(), 'build', 'icon.png'),
    path.join(app.getAppPath(), 'build', 'icon.png'),
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
