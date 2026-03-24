import path from 'node:path'
import { Worker } from 'node:worker_threads'
import type Database from 'better-sqlite3'
import type { ShiftCloseReport } from '../../shared/types/report'
import { ReportGenerationError } from '../errors'
import { ReportJobRepository } from '../repositories/reportJobRepository'

export class ReportService {
  private readonly reportJobRepository: ReportJobRepository

  constructor(db: Database.Database) {
    this.reportJobRepository = new ReportJobRepository(db)
  }

  async generateShiftClose(sessionId: number) {
    const report = await this.runWorker(sessionId)
    const recipientEmail = this.reportJobRepository.getPrimaryRecipientEmail()
    if (recipientEmail) {
      this.reportJobRepository.create(report.sessionId, recipientEmail, report.pdfPath)
    }

    return report
  }

  listPendingEmails() {
    return this.reportJobRepository.listPending()
  }

  private runWorker(sessionId: number) {
    return new Promise<ShiftCloseReport>((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, '..', 'workers', 'reportWorker.js'), {
        workerData: { sessionId },
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
