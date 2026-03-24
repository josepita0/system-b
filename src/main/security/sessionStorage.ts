import fs from 'node:fs'
import path from 'node:path'
import { getDataDirectory } from '../database/connection'

interface SessionFile {
  sessionId: number
  token: string
  lastValidatedAt: number
  protected: boolean
}

function getSessionFilePath() {
  return path.join(getDataDirectory(), 'current-session.json')
}

function getSafeStorage() {
  try {
    const electron = require('electron') as {
      safeStorage?: {
        isEncryptionAvailable: () => boolean
        encryptString: (value: string) => Buffer
        decryptString: (value: Buffer) => string
      }
    }

    return electron.safeStorage
  } catch {
    return undefined
  }
}

function canProtectSession() {
  const safeStorage = getSafeStorage()
  return Boolean(safeStorage?.isEncryptionAvailable())
}

export function writeCurrentSession(sessionId: number, token: string) {
  const payload: SessionFile = canProtectSession()
    ? {
        sessionId,
        token: getSafeStorage()!.encryptString(token).toString('base64'),
        lastValidatedAt: 0,
        protected: true,
      }
    : {
        sessionId,
        token,
        lastValidatedAt: 0,
        protected: false,
      }

  fs.writeFileSync(getSessionFilePath(), JSON.stringify(payload))
}

export function readCurrentSession(): SessionFile | null {
  const filePath = getSessionFilePath()
  if (!fs.existsSync(filePath)) {
    return null
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<SessionFile> & { token: string; sessionId: number }
  const lastValidatedAt = parsed.lastValidatedAt ?? 0

  if (!parsed.protected) {
    return {
      sessionId: parsed.sessionId,
      token: parsed.token,
      lastValidatedAt,
      protected: false,
    }
  }

  const safeStorage = getSafeStorage()
  if (!safeStorage?.isEncryptionAvailable()) {
    return null
  }

  return {
    sessionId: parsed.sessionId,
    token: safeStorage.decryptString(Buffer.from(parsed.token, 'base64')),
    lastValidatedAt,
    protected: true,
  }
}

export function updateCurrentSessionValidation(sessionId: number, token: string, lastValidatedAt = Date.now()) {
  const filePath = getSessionFilePath()
  if (!fs.existsSync(filePath)) {
    return
  }

  const payload: SessionFile = canProtectSession()
    ? {
        sessionId,
        token: getSafeStorage()!.encryptString(token).toString('base64'),
        lastValidatedAt,
        protected: true,
      }
    : {
        sessionId,
        token,
        lastValidatedAt,
        protected: false,
      }

  fs.writeFileSync(filePath, JSON.stringify(payload))
}

export function clearCurrentSession() {
  const filePath = getSessionFilePath()
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true })
  }
}
