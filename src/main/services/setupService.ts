import type Database from 'better-sqlite3'
import type { SetupStatus } from '../../shared/types/setup'
import { ValidationError } from '../errors'
import { AppSetupRepository } from '../repositories/appSetupRepository'
import { UserRepository } from '../repositories/userRepository'
import { AuthService } from './authService'

const SETUP_VERSION = 'v1'

export class SetupService {
  private readonly auth: AuthService
  private readonly users: UserRepository
  private readonly setup: AppSetupRepository

  constructor(db: Database.Database) {
    this.auth = new AuthService(db)
    this.users = new UserRepository(db)
    this.setup = new AppSetupRepository(db)
  }

  getStatus(): SetupStatus {
    const bootstrapInfo = this.auth.getBootstrapInfo()
    const record = this.setup.get()
    const hasAdmin = this.users.countAdmins() > 0
    const bootstrapPending = Boolean(bootstrapInfo)
    const wizardRequired = (record?.wizard_required ?? 0) === 1

    return {
      hasAdmin,
      bootstrapPending,
      bootstrapFilePath: bootstrapInfo?.filePath ?? null,
      bootstrapDisplay: bootstrapInfo
        ? {
            username: bootstrapInfo.username,
            temporaryPassword: bootstrapInfo.temporaryPassword,
            recoveryCodes: bootstrapInfo.recoveryCodes,
          }
        : null,
      wizardRequired,
      completedAt: record?.completed_at ?? null,
      completedByEmployeeId: record?.completed_by_employee_id ?? null,
      version: record?.version ?? null,
      mustRunWizard: wizardRequired && (record?.completed_at ?? null) === null,
    }
  }

  requireWizard() {
    this.setup.requireWizard(SETUP_VERSION)
  }

  complete(actorEmployeeId: number) {
    const actor = this.auth.requireCurrentUser()
    if (actor.id !== actorEmployeeId) {
      throw new ValidationError('La sesion actual no coincide con el usuario que intenta cerrar la instalacion.')
    }

    if (actor.role !== 'admin') {
      throw new ValidationError('Solo un administrador puede cerrar la instalacion inicial.')
    }

    if (actor.mustChangePassword) {
      throw new ValidationError('Debe actualizar la clave inicial antes de finalizar la instalacion.')
    }

    this.setup.complete(actor.id, SETUP_VERSION)
    return { success: true as const }
  }
}
