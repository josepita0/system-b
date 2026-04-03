import { ipcMain } from 'electron'
import { reportChannels } from '../../shared/ipc/reports'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { EmailQueueService } from '../services/emailQueueService'
import { LicenseService } from '../services/licenseService'
import { ReportService } from '../services/reportService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

/** Durante `vitest` no se exige licencia para reportes (pruebas automatizadas). */
function assertReportLicenseIfNotTesting(
  licenseService: LicenseService,
  feature: 'reports.generate_pdf' | 'reports.retry_email',
  actorId: number,
) {
  if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') {
    return
  }
  licenseService.assertFeatureEnabled(feature, actorId)
}

export function registerReportHandlers() {
  const db = getDb()
  const emailQueueService = new EmailQueueService(db)
  const reportService = new ReportService(db, emailQueueService)
  const licenseService = new LicenseService(db)
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())

  ipcMain.handle(reportChannels.generateShiftClose, (_event, sessionId: number) =>
    executeIpc(() => {
      const actor = guards.requireRole('manager')
      assertReportLicenseIfNotTesting(licenseService, 'reports.generate_pdf', actor.id)
      return reportService.generateShiftClose(sessionId)
    }),
  )
  ipcMain.handle(reportChannels.pendingEmails, () =>
    executeIpc(() => {
      guards.requireRole('manager')
      return reportService.listPendingEmails()
    }),
  )
  ipcMain.handle(reportChannels.retryPendingEmails, () =>
    executeIpc(() => {
      const actor = guards.requireRole('manager')
      assertReportLicenseIfNotTesting(licenseService, 'reports.retry_email', actor.id)
      return emailQueueService.retryPendingEmails()
    }),
  )
}
