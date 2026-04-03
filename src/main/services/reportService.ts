import path from 'node:path'
import { Worker } from 'node:worker_threads'
import type Database from 'better-sqlite3'
import type { ShiftCloseReport } from '../../shared/types/report'
import { getDatabasePath } from '../database/connection'
import { ReportGenerationError } from '../errors'
import { ReportJobRepository } from '../repositories/reportJobRepository'
import { EmailQueueService } from './emailQueueService'

export class ReportService {
  private readonly reportJobRepository: ReportJobRepository

  constructor(
    private readonly db: Database.Database,
    private readonly emailQueueService: EmailQueueService,
  ) {
    this.reportJobRepository = new ReportJobRepository(db)
  }

  async generateShiftClose(sessionId: number) {
    const report = await this.runWorker(sessionId)
    const recipientEmail = this.reportJobRepository.getPrimaryRecipientEmail()
    let emailEnqueued = false
    let emailSentImmediately = false
    if (recipientEmail) {
      const outcome = await this.emailQueueService.sendShiftCloseNowOrQueue({
        sessionId: report.sessionId,
        recipientEmail,
        pdfPath: report.pdfPath,
      })
      emailEnqueued = outcome.queued
      emailSentImmediately = outcome.sentImmediately
    }

    return {
      ...report,
      emailEnqueued,
      emailSentImmediately,
      reportRecipientEmail: recipientEmail ?? null,
    }
  }

  listPendingEmails() {
    return this.reportJobRepository.listPending()
  }

  private runWorker(sessionId: number) {
    /** Misma ruta que `getDb()`; el worker no puede resolver `userData` de Electron y caia en `.data` del cwd. */
    const databasePath = getDatabasePath()
    return new Promise<ShiftCloseReport>((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, '..', 'workers', 'reportWorker.js'), {
        workerData: { sessionId, databasePath },
      })

      worker.once('message', (message: { ok: boolean; data?: ShiftCloseReport; error?: string }) => {
        if (message.ok && message.data) {
          resolve(message.data)
          return
        }

        reject(new ReportGenerationError(message.error ?? 'No fue posible generar el reporte.'))
      })

      worker.once('error', (error) => {
        reject(new ReportGenerationError(error instanceof Error ? error.message : 'No fue posible ejecutar el worker de reportes.'))
      })

      worker.once('exit', (code) => {
        if (code !== 0) {
          reject(new ReportGenerationError(`El worker de reportes finalizo con codigo ${code}.`))
        }
      })
    })
  }
}
