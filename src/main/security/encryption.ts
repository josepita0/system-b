import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getDataDirectory } from '../database/connection'

function getKeyPath() {
  return path.join(getDataDirectory(), 'app.key')
}

function getOrCreateKey() {
  const keyPath = getKeyPath()
  if (fs.existsSync(keyPath)) {
    return Buffer.from(fs.readFileSync(keyPath, 'utf8'), 'hex')
  }

  const key = crypto.randomBytes(32)
  fs.writeFileSync(keyPath, key.toString('hex'))
  return key
}

export function encryptJson(payload: unknown) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getOrCreateKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return JSON.stringify({
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  })
}

export function decryptJson<T>(payload: string): T {
  const parsed = JSON.parse(payload) as { iv: string; tag: string; data: string }
  const decipher = crypto.createDecipheriv('aes-256-gcm', getOrCreateKey(), Buffer.from(parsed.iv, 'hex'))
  decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(parsed.data, 'hex')), decipher.final()])
  return JSON.parse(decrypted.toString('utf8')) as T
}

export function encryptString(payload: string) {
  return encryptJson({ value: payload })
}

export function decryptString(payload: string) {
  return decryptJson<{ value: string }>(payload).value
}
