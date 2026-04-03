import type {
  ActivateLicenseByKeyInput,
  ActivateLicenseManualInput,
  CancelLicenseInput,
  GenerateLicensePanelCodeInput,
  LicenseAccessSession,
  LicenseFeatureFlags,
  LicensePanelCodeResult,
  LicenseStatusInfo,
  RenewLicenseInput,
  ValidateLicenseSecretInput,
} from '../types/license'

export const licenseChannels = {
  getStatus: 'license:getStatus',
  getFeatureFlags: 'license:getFeatureFlags',
  validateSecretAccess: 'license:validateSecretAccess',
  generatePanelAccessCode: 'license:generatePanelAccessCode',
  activateByKey: 'license:activateByKey',
  activateManual: 'license:activateManual',
  renew: 'license:renew',
  cancel: 'license:cancel',
} as const

export const licenseEvents = {
  openAdminPanel: 'license:openAdminPanel',
} as const

export interface LicenseApi {
  getStatus: () => Promise<LicenseStatusInfo>
  getFeatureFlags: () => Promise<LicenseFeatureFlags>
  validateSecretAccess: (payload: ValidateLicenseSecretInput) => Promise<LicenseAccessSession>
  generatePanelAccessCode: (payload: GenerateLicensePanelCodeInput) => Promise<LicensePanelCodeResult>
  activateByKey: (payload: ActivateLicenseByKeyInput) => Promise<LicenseStatusInfo>
  activateManual: (payload: ActivateLicenseManualInput) => Promise<LicenseStatusInfo>
  renew: (payload: RenewLicenseInput) => Promise<LicenseStatusInfo>
  cancel: (payload: CancelLicenseInput) => Promise<LicenseStatusInfo>
  onOpenAdminPanel: (callback: () => void) => () => void
}
