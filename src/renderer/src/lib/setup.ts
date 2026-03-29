import type { SetupStatus } from '@shared/types/setup'

const defaultSetupStatus: SetupStatus = {
  hasAdmin: true,
  bootstrapPending: false,
  bootstrapFilePath: null,
  bootstrapDisplay: null,
  wizardRequired: false,
  completedAt: null,
  completedByEmployeeId: null,
  version: null,
  mustRunWizard: false,
}

export function hasSetupApi() {
  return typeof window !== 'undefined' && Boolean(window.api?.setup?.getStatus)
}

function isMissingSetupHandlerError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes(`No handler registered for '${'setup:getStatus'}'`)
  )
}

export async function getSetupStatusSafe() {
  if (!hasSetupApi()) {
    return defaultSetupStatus
  }

  try {
    return await window.api.setup.getStatus()
  } catch (error) {
    if (isMissingSetupHandlerError(error)) {
      return defaultSetupStatus
    }

    throw error
  }
}
