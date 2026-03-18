import fs from 'node:fs'
import path from 'node:path'
import { getDataDirectory } from '../database/connection'

interface SessionFile {
  sessionId: number
  token: string
}

function getSessionFilePath() {
  return path.join(getDataDirectory(), 'current-session.json')
}

export function writeCurrentSession(sessionId: number, token: string) {
  fs.writeFileSync(getSessionFilePath(), JSON.stringify({ sessionId, token }))
}

export function readCurrentSession(): SessionFile | null {
  const filePath = getSessionFilePath()
  if (!fs.existsSync(filePath)) {
    return null
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SessionFile
}

export function clearCurrentSession() {
  const filePath = getSessionFilePath()
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true })
  }
}
