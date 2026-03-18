import crypto from 'node:crypto'

const KEY_LENGTH = 64

export function hashSecret(secret: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(secret, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

export function verifySecret(secret: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) {
    return false
  }

  const derived = crypto.scryptSync(secret, salt, KEY_LENGTH)
  const stored = Buffer.from(hash, 'hex')

  if (derived.length !== stored.length) {
    return false
  }

  return crypto.timingSafeEqual(derived, stored)
}

export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function randomSecret(length = 18) {
  return crypto.randomBytes(length).toString('base64url')
}

export function randomRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString('hex').toUpperCase())
}
