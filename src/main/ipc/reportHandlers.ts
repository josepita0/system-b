import { ipcMain } from 'electron'
import { reportChannels } from '../../shared/ipc/reports'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { EmailQueueService } from '../services/emailQueueService'
import { LicenseService } from '../services/licenseService'
import { ReportService } from '../services/reportService'
import { executeIpc } from './response'

export function registerReportHandlers() {
  const db = getDb()
  const reportService = new ReportService(db)
  const emailQueueService = new EmailQueueService(db)
  const licenseService = new LicenseService(db)
  const auth = new AuthService(db)
  const authorization = new AuthorizationService()

  ipcMain.handle(reportChannels.generateShiftClose, (_event, sessionId: number) =>
    executeIpc(() => {
      const actor = auth.requireCurrentUser()
      authorization.requireRole(actor.role, 'manager')
      licenseService.assertFeatureEnabled('reports.generate_pdf', actor.id)
      return reportService.generateShiftClose(sessionId)
    }),
  )
  ipcMain.handle(reportChannels.pendingEmails, () =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
      return reportService.listPendingEmails()
    }),
  )
  ipcMain.handle(reportChannels.retryPendingEmails, () =>
    executeIpc(() => {
      const actor = auth.requireCurrentUser()
      authorization.requireRole(actor.role, 'manager')
      licenseService.assertFeatureEnabled('reports.retry_email', actor.id)
      return emailQueueService.retryPendingEmails()
    }),
  )
}
