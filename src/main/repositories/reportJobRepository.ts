import type Database from 'better-sqlite3'
import type { ReportJob } from '../../shared/types/report'

function mapJob(row: any): ReportJob {
  return {
    id: row.id,
    sessionId: row.session_id,
    recipientEmail: row.recipient_email,
    pdfPath: row.pdf_path,
    status: row.status,
    lastError: row.last_error,
    attempts: row.attempts ?? 0,
    createdAt: row.created_at,
  }
}

export class ReportJobRepository {
  constructor(private readonly db: Database.Database) {}

  create(sessionId: number, recipientEmail: string, pdfPath: string) {
    const result = this.db
      .prepare(
        'INSERT INTO report_jobs (session_id, recipient_email, pdf_path) VALUES (?, ?, ?)',
      )
      .run(sessionId, recipientEmail, pdfPath)

    return this.getById(Number(result.lastInsertRowid))!
  }

  getById(id: number) {
    const row = this.db
      .prepare(
        `SELECT report_jobs.*, COUNT(report_job_attempts.id) AS attempts
         FROM report_jobs
         LEFT JOIN report_job_attempts ON report_job_attempts.report_job_id = report_jobs.id
         WHERE report_jobs.id = ?
         GROUP BY report_jobs.id`,
      )
      .get(id)

    return row ? mapJob(row) : null
  }

  listPending() {
    return this.db
      .prepare(
        `SELECT report_jobs.*, COUNT(report_job_attempts.id) AS attempts
         FROM report_jobs
         LEFT JOIN report_job_attempts ON report_job_attempts.report_job_id = report_jobs.id
         WHERE report_jobs.status IN ('pending', 'failed')
         GROUP BY report_jobs.id
         ORDER BY report_jobs.created_at ASC`,
      )
      .all()
      .map(mapJob)
  }

  markSent(jobId: number) {
    this.db.prepare("UPDATE report_jobs SET status = 'sent', sent_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = ?").run(jobId)
  }

  markFailed(jobId: number, errorMessage: string) {
    this.db.prepare("UPDATE report_jobs SET status = 'failed', last_error = ? WHERE id = ?").run(errorMessage, jobId)
  }

  recordAttempt(jobId: number, success: boolean, errorMessage: string | null = null) {
    this.db
      .prepare(
        'INSERT INTO report_job_attempts (report_job_id, success, error_message) VALUES (?, ?, ?)',
      )
      .run(jobId, success ? 1 : 0, errorMessage)
  }

  getPrimaryRecipientEmail() {
    const settingsRow = this.db
      .prepare('SELECT report_recipient_email FROM settings WHERE id = 1')
      .get() as { report_recipient_email?: string | null } | undefined
    const fromSettings = settingsRow?.report_recipient_email?.trim()
    if (fromSettings) {
      return fromSettings
    }

    const row = this.db
      .prepare('SELECT email FROM report_recipients WHERE is_primary = 1 ORDER BY id ASC LIMIT 1')
      .get() as { email?: string } | undefined

    return row?.email ?? null
  }
}
