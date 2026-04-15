import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import type Database from 'better-sqlite3'
import crypto from 'node:crypto'
import { ConflictError, EmailDeliveryError } from '../errors'
import { PasswordResetEmailCodeRepository } from '../repositories/passwordResetEmailCodeRepository'
import { resolveSmtpPasswordFromStored } from './smtpConfig'
import { sha256 } from '../security/password'

type SettingsRow = {
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_secure?: number | boolean | null
  smtp_user?: string | null
  smtp_password?: string | null
}

function nowPlusMinutesIso(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function nowMinusHoursIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function generateSixDigitCode() {
  const n = crypto.randomInt(0, 1_000_000)
  return String(n).padStart(6, '0')
}

function parseSqliteTimestampToMs(value: string) {
  // SQLite CURRENT_TIMESTAMP -> "YYYY-MM-DD HH:MM:SS"
  // Date.parse no es consistente sin zona horaria, así que normalizamos a ISO UTC.
  const raw = String(value).trim()
  if (!raw) return NaN
  if (raw.includes('T')) {
    return Date.parse(raw)
  }
  if (raw.includes(' ')) {
    return Date.parse(raw.replace(' ', 'T') + 'Z')
  }
  return Date.parse(raw)
}

export class PasswordResetEmailService {
  private readonly repo: PasswordResetEmailCodeRepository

  constructor(private readonly db: Database.Database) {
    this.repo = new PasswordResetEmailCodeRepository(db)
  }

  private getSettingsRow(): SettingsRow | undefined {
    return this.db.prepare('SELECT * FROM settings WHERE id = 1').get() as SettingsRow | undefined
  }

  private createTransporter(settings: SettingsRow, smtpPassword: string): Transporter {
    return nodemailer.createTransport({
      host: settings.smtp_host!,
      port: settings.smtp_port || 587,
      secure: Boolean(settings.smtp_secure),
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 20_000,
      auth: {
        user: settings.smtp_user!,
        pass: smtpPassword,
      },
    })
  }

  sendCode(params: { employeeId: number; email: string; requestedByEmployeeId: number | null }) {
    const settings = this.getSettingsRow()
    const smtpPassword = resolveSmtpPasswordFromStored(settings?.smtp_password)

    if (!settings?.smtp_host || !settings.smtp_user || !smtpPassword) {
      throw new EmailDeliveryError('La configuracion SMTP no esta completa.')
    }

    const latest = this.repo.getLatestActiveForEmployee(params.employeeId)
    if (latest) {
      const createdAtMs = parseSqliteTimestampToMs(latest.created_at)
      if (Number.isFinite(createdAtMs) && Date.now() - createdAtMs < 60_000) {
        throw new ConflictError('Ya se envio un codigo recientemente. Espere un minuto.')
      }
    }

    const lastHourCount = this.repo.countRequestedSince(params.employeeId, nowMinusHoursIso(1))
    if (lastHourCount >= 5) {
      throw new ConflictError('Se alcanzo el limite de envios. Intente mas tarde.')
    }

    const code = generateSixDigitCode()
    const expiresAtIso = nowPlusMinutesIso(10)
    const codeHash = sha256(code)

    this.repo.create({
      employeeId: params.employeeId,
      email: params.email,
      codeHash,
      expiresAtIso,
      requestedByEmployeeId: params.requestedByEmployeeId,
    })

    const transporter = this.createTransporter(settings, smtpPassword)
    return transporter.sendMail({
      from: settings.smtp_user,
      to: params.email,
      subject: 'Codigo para cambiar tu contrasena',
      text: `Tu codigo es: ${code}\n\nVence en 10 minutos.\n\nSi no solicitaste este codigo, puedes ignorar este mensaje.`,
    })
  }

  verifyAndConsume(params: { employeeId: number; code: string }) {
    return this.repo.consumeIfValid(params.employeeId, sha256(params.code))
  }
}

