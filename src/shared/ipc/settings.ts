import type { SmtpSettingsPublic, SmtpTestResult, UpdateSmtpSettingsInput } from '../types/settings'

export const settingsChannels = {
  getSmtpSettings: 'settings:getSmtpSettings',
  updateSmtpSettings: 'settings:updateSmtpSettings',
  testSmtp: 'settings:testSmtp',
} as const

export interface SettingsApi {
  getSmtpSettings: () => Promise<SmtpSettingsPublic>
  updateSmtpSettings: (payload: UpdateSmtpSettingsInput) => Promise<void>
  testSmtp: () => Promise<SmtpTestResult>
}
