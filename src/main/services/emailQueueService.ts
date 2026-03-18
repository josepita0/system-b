import nodemailer from 'nodemailer'
import type Database from 'better-sqlite3'
import { EmailDeliveryError } from '../errors'
import { ReportJobRepository } from '../repositories/reportJobRepository'

export class EmailQueueService {
  private readonly reportJobRepository: ReportJobRepository

  constructor(private readonly db: Database.Database) {
    this.reportJobRepository = new ReportJobRepository(db)
  }

  async retryPendingEmails() {
    const jobs = this.reportJobRepository.listPending()
    const settings = this.db.prepare('SELECT * FROM settings WHERE id = 1').get() as any

    if (!settings?.smtp_host || !settings?.smtp_user || !settings?.smtp_password) {
      throw new EmailDeliveryError('La configuracion SMTP no esta completa.')
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: Boolean(settings.smtp_secure),
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_password,
      },
    })

    let processed = 0
    for (const job of jobs) {
      try {
        await transporter.sendMail({
          from: settings.smtp_user,
          to: job.recipientEmail,
          subject: `Cierre de turno ${job.sessionId}`,
          text: 'Adjunto reporte de cierre de turno.',
          attachments: [{ path: job.pdfPath }],
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
