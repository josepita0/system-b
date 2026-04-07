import type Database from 'better-sqlite3'
import nodemailer from 'nodemailer'
import { updateCashSettingsSchema } from '../../shared/schemas/cashSettingsSchema'
import { updateSmtpSettingsSchema } from '../../shared/schemas/smtpSettingsSchema'
import type {
  CashSettingsPublic,
  SmtpSettingsPublic,
  SmtpTestResult,
  UpdateCashSettingsInput,
  UpdateSmtpSettingsInput,
} from '../../shared/types/settings'
import { EmailDeliveryError, ValidationError } from '../errors'
import { encryptString } from '../security/encryption'
import { resolveSmtpPasswordFromStored } from './smtpConfig'

type SettingsRow = {
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_password: string | null
  smtp_secure: number | null
  report_recipient_email: string | null
  min_opening_cash?: number | null
}

export class SettingsService {
  constructor(private readonly db: Database.Database) {}

  getSmtpSettingsPublic(): SmtpSettingsPublic {
    const row = this.db
      .prepare(
        'SELECT smtp_host, smtp_port, smtp_user, smtp_secure, smtp_password, report_recipient_email FROM settings WHERE id = 1',
      )
      .get() as SettingsRow | undefined
    const passwordFromEnv = Boolean(process.env.SYSTEM_BARRA_SMTP_PASSWORD?.trim())
    return {
      smtpHost: row?.smtp_host ?? null,
      smtpPort: row?.smtp_port ?? null,
      smtpUser: row?.smtp_user ?? null,
      smtpSecure: Boolean(row?.smtp_secure),
      reportRecipientEmail: row?.report_recipient_email?.trim() ? row.report_recipient_email.trim() : null,
      passwordConfigured: Boolean(row?.smtp_password && String(row.smtp_password).trim()),
      passwordFromEnv,
    }
  }

  updateSmtpSettings(input: UpdateSmtpSettingsInput) {
    const parsed = updateSmtpSettingsSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '))
    }

    const passwordNew =
      parsed.data.smtpPassword !== undefined && parsed.data.smtpPassword.trim() !== ''
        ? `enc:${encryptString(parsed.data.smtpPassword.trim())}`
        : null

    const reportEmail =
      parsed.data.reportRecipientEmail == null || parsed.data.reportRecipientEmail === ''
        ? null
        : String(parsed.data.reportRecipientEmail).trim() || null

    this.db
      .prepare(
        `UPDATE settings SET
           smtp_host = ?,
           smtp_port = ?,
           smtp_user = ?,
           smtp_secure = ?,
           smtp_password = COALESCE(?, smtp_password),
           report_recipient_email = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
      )
      .run(
        parsed.data.smtpHost,
        parsed.data.smtpPort,
        parsed.data.smtpUser,
        parsed.data.smtpSecure ? 1 : 0,
        passwordNew,
        reportEmail,
      )
  }

  async testSmtpConnection(): Promise<SmtpTestResult> {
    const row = this.db.prepare('SELECT smtp_host, smtp_port, smtp_user, smtp_secure, smtp_password FROM settings WHERE id = 1').get() as
      | SettingsRow
      | undefined

    let smtpPassword: string | null
    try {
      smtpPassword = resolveSmtpPasswordFromStored(row?.smtp_password)
    } catch (e) {
      const msg = e instanceof EmailDeliveryError ? e.message : 'No se pudo leer la clave SMTP.'
      return { ok: false, message: msg }
    }

    if (!row?.smtp_host || !row?.smtp_user || !smtpPassword) {
      return {
        ok: false,
        message: 'Complete host, usuario y contraseña SMTP (o defina SYSTEM_BARRA_SMTP_PASSWORD).',
      }
    }

    const transporter = nodemailer.createTransport({
      host: row.smtp_host,
      port: row.smtp_port || 587,
      secure: Boolean(row.smtp_secure),
      auth: {
        user: row.smtp_user,
        pass: smtpPassword,
      },
    })

    try {
      await transporter.verify()
      return { ok: true, message: 'Conexion SMTP verificada correctamente.' }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido al verificar SMTP.'
      return { ok: false, message: msg }
    }
  }

  getCashSettingsPublic(): CashSettingsPublic {
    const row = this.db.prepare('SELECT min_opening_cash FROM settings WHERE id = 1').get() as SettingsRow | undefined
    const v = row?.min_opening_cash
    return { minOpeningCash: typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0 }
  }

  updateCashSettings(input: UpdateCashSettingsInput) {
    const parsed = updateCashSettingsSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '))
    }

    this.db
      .prepare(
        `UPDATE settings
         SET min_opening_cash = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
      )
      .run(parsed.data.minOpeningCash)
  }
}
