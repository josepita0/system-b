import type { ReportJob, ShiftCloseReport } from '../types/report'

export const reportChannels = {
  generateShiftClose: 'reports:generateShiftClose',
  pendingEmails: 'reports:pendingEmails',
  retryPendingEmails: 'reports:retryPendingEmails',
} as const

export interface ReportApi {
  generateShiftClose: (sessionId: number) => Promise<ShiftCloseReport>
  pendingEmails: () => Promise<ReportJob[]>
  retryPendingEmails: () => Promise<{ processed: number }>
}
