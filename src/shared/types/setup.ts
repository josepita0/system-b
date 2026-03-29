export interface BootstrapDisplay {
  username: string
  temporaryPassword: string
  recoveryCodes: string[]
}

export interface SetupStatus {
  hasAdmin: boolean
  bootstrapPending: boolean
  bootstrapFilePath: string | null
  /** Presente solo mientras el acceso bootstrap sigue vigente (misma fuente que el JSON en disco). */
  bootstrapDisplay: BootstrapDisplay | null
  wizardRequired: boolean
  completedAt: string | null
  completedByEmployeeId: number | null
  version: string | null
  mustRunWizard: boolean
}
