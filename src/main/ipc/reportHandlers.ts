import { ipcMain } from 'electron'
import { reportChannels } from '../../shared/ipc/reports'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { EmailQueueService } from '../services/emailQueueService'
import { ReportService } from '../services/reportService'
import { executeIpc } from './response'

export function registerReportHandlers() {
  const db = getDb()
  const reportService = new ReportService(db)
  const emailQueueService = new EmailQueueService(db)
  const auth = new AuthService(db)
  const authorization = new AuthorizationService()

  ipcMain.handle(reportChannels.generateShiftClose, (_event, sessionId: number) =>
    executeIpc(() => {
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
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
      authorization.requireRole(auth.requireCurrentUser().role, 'manager')
      return emailQueueService.retryPendingEmails()
    }),
  )
}
