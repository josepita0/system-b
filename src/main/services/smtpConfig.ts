import { EmailDeliveryError } from '../errors'
import { decryptString } from '../security/encryption'

/**
 * Resuelve la contraseña SMTP: `SYSTEM_BARRA_SMTP_PASSWORD` > texto plano en DB > prefijo `enc:`.
 * Falla con `EmailDeliveryError` si el valor cifrado no puede descifrarse.
 */
export function resolveSmtpPasswordFromStored(rawValue: unknown): string | null {
  const override = process.env.SYSTEM_BARRA_SMTP_PASSWORD?.trim()
  if (override) {
    return override
  }

  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return null
  }

  if (!rawValue.startsWith('enc:')) {
    return rawValue
  }

  try {
    return decryptString(rawValue.slice(4))
  } catch {
    throw new EmailDeliveryError('La clave SMTP cifrada no pudo desencriptarse.')
  }
}
