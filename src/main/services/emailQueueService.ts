import fs from 'node:fs'
import path from 'node:path'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import type Database from 'better-sqlite3'
import { EmailDeliveryError } from '../errors'
import { ReportJobRepository } from '../repositories/reportJobRepository'
import { resolveSmtpPasswordFromStored } from './smtpConfig'

type SettingsRow = {
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_secure?: number | boolean | null
  smtp_user?: string | null
  smtp_password?: string | null
}

export class EmailQueueService {
  private readonly reportJobRepository: ReportJobRepository

  constructor(private readonly db: Database.Database) {
    this.reportJobRepository = new ReportJobRepository(db)
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

  /**
   * Lee el PDF en memoria: evita fallos intermitentes en Windows con `path` en stream
   * y asegura que el archivo esté completamente legible antes de SMTP.
   */
  private readPdfAttachment(pdfPath: string) {
    const content = fs.readFileSync(pdfPath)
    const filename = path.basename(pdfPath)
    return { content, filename }
  }

  private async sendShiftCloseAttachment(
    transporter: Transporter,
    fromAddress: string,
    job: { sessionId: number; recipientEmail: string; pdfPath: string },
  ) {
    const { content, filename } = this.readPdfAttachment(job.pdfPath)
    await transporter.sendMail({
      from: fromAddress,
      to: job.recipientEmail,
      subject: `Cierre de turno`,
      text: 'Adjunto reporte de cierre de turno.',
      attachments: [{ filename, content }],
    })
  }

  private async sendShiftCloseWithRetries(
    transporter: Transporter,
    fromAddress: string,
    job: { sessionId: number; recipientEmail: string; pdfPath: string },
  ) {
    const maxAttempts = 3
    let lastError: unknown
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await this.sendShiftCloseAttachment(transporter, fromAddress, job)
        return
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  /**
   * Intenta enviar el PDF por SMTP al momento. Si el envío falla o falta SMTP,
   * crea un `report_jobs` en estado fallido/pendiente de reintento.
   */
  async sendShiftCloseNowOrQueue(params: {
    sessionId: number
    recipientEmail: string
    pdfPath: string
  }): Promise<{ sentImmediately: boolean; queued: boolean }> {
    const settings = this.getSettingsRow()
    const smtpPassword = resolveSmtpPasswordFromStored(settings?.smtp_password)

    if (!settings?.smtp_host || !settings.smtp_user || !smtpPassword) {
      this.reportJobRepository.create(params.sessionId, params.recipientEmail, params.pdfPath)
      return { sentImmediately: false, queued: true }
    }

    const transporter = this.createTransporter(settings, smtpPassword)

    try {
      await this.sendShiftCloseWithRetries(transporter, settings.smtp_user, params)
      return { sentImmediately: true, queued: false }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      const job = this.reportJobRepository.create(params.sessionId, params.recipientEmail, params.pdfPath)
      this.reportJobRepository.recordAttempt(job.id, false, message)
      this.reportJobRepository.markFailed(job.id, message)
      return { sentImmediately: false, queued: true }
    }
  }

  async retryPendingEmails() {
    const jobs = this.reportJobRepository.listPending()
    const settings = this.getSettingsRow()
    const smtpPassword = resolveSmtpPasswordFromStored(settings?.smtp_password)

    if (!settings?.smtp_host || !settings?.smtp_user || !smtpPassword) {
      throw new EmailDeliveryError('La configuracion SMTP no esta completa.')
    }

    const transporter = this.createTransporter(settings, smtpPassword)

    let processed = 0
    for (const job of jobs) {
      try {
        await this.sendShiftCloseAttachment(transporter, settings.smtp_user!, {
          sessionId: job.sessionId,
          recipientEmail: job.recipientEmail,
          pdfPath: job.pdfPath,
        })

        this.reportJobRepository.recordAttempt(job.id, true, null)
        this.reportJobRepository.markSent(job.id)
        processed += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        this.reportJobRepository.recordAttempt(job.id, false, message)
        this.reportJobRepository.markFailed(job.id, message)
      }
    }

    return { processed }
  }
}
