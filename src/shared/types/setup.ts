export interface SetupStatus {
  hasAdmin: boolean
  bootstrapPending: boolean
  bootstrapFilePath: string | null
  wizardRequired: boolean
  completedAt: string | null
  completedByEmployeeId: number | null
  version: string | null
  mustRunWizard: boolean
}
