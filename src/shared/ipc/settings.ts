import type {
  CashSettingsPublic,
  SmtpSettingsPublic,
  SmtpTestResult,
  UpdateCashSettingsInput,
  UpdateSmtpSettingsInput,
} from '../types/settings'

export const settingsChannels = {
  getSmtpSettings: 'settings:getSmtpSettings',
  updateSmtpSettings: 'settings:updateSmtpSettings',
  testSmtp: 'settings:testSmtp',
  getCashSettings: 'settings:getCashSettings',
  updateCashSettings: 'settings:updateCashSettings',
} as const

export interface SettingsApi {
  getSmtpSettings: () => Promise<SmtpSettingsPublic>
  updateSmtpSettings: (payload: UpdateSmtpSettingsInput) => Promise<void>
  testSmtp: () => Promise<SmtpTestResult>
  getCashSettings: () => Promise<CashSettingsPublic>
  updateCashSettings: (payload: UpdateCashSettingsInput) => Promise<void>
}
