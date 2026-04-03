export type LicensePlanType = 'monthly' | 'semiannual' | 'annual'
export type LicenseActivationMode = 'key' | 'manual'
export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'missing'
export type LicensedFeatureKey = 'dashboard.view' | 'reports.generate_pdf' | 'reports.retry_email'

export interface LicenseStatusInfo {
  id: number | null
  status: LicenseStatus
  activationMode: LicenseActivationMode | null
  planType: LicensePlanType | null
  activatedAt: string | null
  expiresAt: string | null
  issuedTo: string | null
  notes: string | null
  createdByEmployeeId: number | null
  lastUpdatedAt: string | null
  daysRemaining: number | null
  message: string
}

export interface LicenseFeatureFlags {
  status: LicenseStatus
  dashboardEnabled: boolean
  reportPdfEnabled: boolean
  reportEmailEnabled: boolean
  reason: string | null
  expiresAt: string | null
}

export interface ValidateLicenseSecretInput {
  secret: string
}

export interface LicenseAccessSession {
  accessToken: string
  expiresAt: string
}

export interface GenerateLicensePanelCodeInput {
  targetEmployeeId: number
}

export interface LicensePanelCodeResult {
  code: string
  expiresAt: string
}

export interface ActivateLicenseByKeyInput {
  accessToken: string
  licenseKey: string
  planType: LicensePlanType
  issuedTo?: string | null
  notes?: string | null
}

export interface ActivateLicenseManualInput {
  accessToken: string
  planType: LicensePlanType
  issuedTo?: string | null
  notes?: string | null
}

export interface RenewLicenseInput {
  accessToken: string
  mode: LicenseActivationMode
  planType: LicensePlanType
  licenseKey?: string | null
  issuedTo?: string | null
  notes?: string | null
}

export interface CancelLicenseInput {
  accessToken: string
  notes?: string | null
}
