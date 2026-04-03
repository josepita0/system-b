import fs from 'node:fs'
import path from 'node:path'
import { getDataDirectory } from '../database/connection'

function safeMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return String(error)
}

/** Registro local mínimo para soporte en piloto (SMTP, IPC sensible, etc.). */
export function appendAppLog(message: string) {
  try {
    const dir = path.join(getDataDirectory(), 'logs')
    fs.mkdirSync(dir, { recursive: true })
    const line = `${new Date().toISOString()} ${message}\n`
    fs.appendFileSync(path.join(dir, 'app.log'), line, 'utf8')
  } catch {
    // evitar fallos secundarios
  }
}

export function appendAppLogError(context: string, error: unknown) {
  appendAppLog(`[${context}] ${safeMessage(error)}`)
}
