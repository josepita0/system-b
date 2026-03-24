import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import type { BootstrapAdminInfo, ChangePasswordInput, LoginInput, SessionInfo } from '../../shared/types/auth'
import type { AuthenticatedUser, User, UserPermission } from '../../shared/types/user'
import { changePasswordSchema, loginSchema, recoverPasswordSchema } from '../../shared/schemas/authSchema'
import { AuthenticationError, ConflictError, LockedAccountError, NotFoundError, RecoveryCodeError, ValidationError } from '../errors'
import { getDataDirectory } from '../database/connection'
import { AuthSessionRepository } from '../repositories/authSessionRepository'
import { AuditLogRepository } from '../repositories/auditLogRepository'
import { AppSetupRepository } from '../repositories/appSetupRepository'
import { RecoveryCodeRepository } from '../repositories/recoveryCodeRepository'
import { UserRepository } from '../repositories/userRepository'
import { randomRecoveryCodes, randomSecret, hashSecret, sha256, verifySecret } from '../security/password'
import { clearCurrentSession, readCurrentSession, updateCurrentSessionValidation, writeCurrentSession } from '../security/sessionStorage'

const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000

function nowPlusDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function nowPlusMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function getBootstrapInfoPath() {
  return path.join(getDataDirectory(), 'initial-admin-access.json')
}

function clearBootstrapInfoFile() {
  const filePath = getBootstrapInfoPath()
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true })
  }
}

function buildPermissions(role: User['role']): UserPermission[] {
  switch (role) {
    case 'admin':
      return [
        'users.manage_profiles',
        'users.manage_credentials',
        'users.manage_roles.employee',
        'users.manage_roles.manager',
        'users.manage_roles.admin',
        'license.manage',
        'products.manage',
        'reports.manage',
        'shifts.manage',
        'documents.self',
        'sales.use',
      ]
    case 'manager':
      return [
        'users.manage_profiles',
        'users.manage_roles.employee',
        'products.manage',
        'reports.manage',
        'shifts.manage',
        'documents.self',
        'sales.use',
      ]
    case 'employee':
    default:
      return ['sales.use', 'documents.self', 'shifts.open']
  }
}

export class AuthService {
  private readonly users: UserRepository
  private readonly sessions: AuthSessionRepository
  private readonly recoveryCodes: RecoveryCodeRepository
  private readonly audit: AuditLogRepository
  private readonly appSetup: AppSetupRepository

  constructor(private readonly db: Database.Database) {
    this.users = new UserRepository(db)
    this.sessions = new AuthSessionRepository(db)
    this.recoveryCodes = new RecoveryCodeRepository(db)
    this.audit = new AuditLogRepository(db)
    this.appSetup = new AppSetupRepository(db)
  }

  ensureInitialAdmin() {
    if (this.users.countAdmins() > 0) {
      return null
    }

    const temporaryPassword = randomSecret(12)
    const recoveryCodes = randomRecoveryCodes()
    const user = this.users.create({
      firstName: 'Administrador',
      lastName: 'Inicial',
      documentId: null,
      email: null,
      username: 'admin',
      role: 'admin',
      passwordHash: hashSecret(temporaryPassword),
      mustChangePassword: 1,
    })

    this.recoveryCodes.replaceForUser(
      user.id,
      recoveryCodes.map((code, index) => ({ codeHash: sha256(code), label: `RC-${index + 1}` })),
      user.id,
    )

    const payload: BootstrapAdminInfo = {
      username: 'admin',
      temporaryPassword,
      recoveryCodes,
      filePath: getBootstrapInfoPath(),
    }

    this.appSetup.requireWizard('v1')
    fs.writeFileSync(getBootstrapInfoPath(), JSON.stringify(payload, null, 2))
    return payload
  }

  getBootstrapInfo() {
    const filePath = getBootstrapInfoPath()
    if (!fs.existsSync(filePath)) {
      return null
    }

    const info = JSON.parse(fs.readFileSync(filePath, 'utf8')) as BootstrapAdminInfo
    const user = this.users.getAuthByIdentifier(info.username)
    if (!user || !user.is_active || user.must_change_password !== 1) {
      clearBootstrapInfoFile()
      return null
    }

    return info
  }

  login(input: LoginInput): SessionInfo {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    const userRow = this.users.getAuthByIdentifier(parsed.data.identifier)
    if (!userRow) {
      throw new AuthenticationError('Credenciales invalidas.')
    }

    if (!userRow.is_active) {
      throw new AuthenticationError('La cuenta esta desactivada.')
    }

    const lockedUntil = userRow.locked_until ? new Date(userRow.locked_until) : null
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      throw new LockedAccountError('La cuenta esta temporalmente bloqueada.')
    }

    if (!userRow.password_hash || !verifySecret(parsed.data.password, userRow.password_hash)) {
      const attempts = (userRow.failed_login_attempts ?? 0) + 1
      const shouldLock = attempts >= 5 ? nowPlusMinutes(15) : null
      this.users.markLoginFailure(userRow.id, shouldLock)
      throw new AuthenticationError('Credenciales invalidas.')
    }

    this.users.markLoginSuccess(userRow.id)

    const token = randomSecret(24)
    const session = this.sessions.create(userRow.id, sha256(token), nowPlusDays(30))
    if (!session) {
      throw new ConflictError('No se pudo crear la sesion.')
    }

    writeCurrentSession(session.id, token)
    return { user: this.buildAuthenticatedUser(this.users.getById(userRow.id)!) }
  }

  logout() {
    const current = readCurrentSession()
    if (current) {
      this.sessions.revoke(current.sessionId)
    }

    clearCurrentSession()
    return { success: true as const }
  }

  getCurrentUser() {
    const sessionFile = readCurrentSession()
    if (!sessionFile) {
      return null
    }

    const session = this.sessions.getActiveByTokenHash(sha256(sessionFile.token))
    if (!session || session.id !== sessionFile.sessionId) {
      clearCurrentSession()
      return null
    }

    if (Date.now() - sessionFile.lastValidatedAt >= SESSION_TOUCH_INTERVAL_MS) {
      this.sessions.touch(session.id)
      updateCurrentSessionValidation(session.id, sessionFile.token)
    }

    const user = this.users.getById(session.employee_id)
    if (!user || !user.isActive) {
      clearCurrentSession()
      return null
    }

    return this.buildAuthenticatedUser(user)
  }

  requireCurrentUser() {
    const user = this.getCurrentUser()
    if (!user) {
      throw new AuthenticationError('Debe iniciar sesion.')
    }

    return user
  }

  recoverPassword(input: { identifier: string; recoveryCode: string; newPassword: string }) {
    const parsed = recoverPasswordSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    const userRow = this.users.getAuthByIdentifier(parsed.data.identifier)
    if (!userRow) {
      throw new NotFoundError('Usuario no encontrado.')
    }

    const match = this.recoveryCodes
      .listByUser(userRow.id)
      .find((item) => !item.used_at && item.code_hash === sha256(parsed.data.recoveryCode))

    if (!match) {
      throw new RecoveryCodeError('Codigo de recuperacion invalido.')
    }

    this.users.setPassword(userRow.id, hashSecret(parsed.data.newPassword), 0)
    this.recoveryCodes.markUsed(match.id)
    if (userRow.username === 'admin') {
      clearBootstrapInfoFile()
    }
    this.audit.create({
      actorEmployeeId: userRow.id,
      action: 'user.password_recovered',
      targetType: 'employee',
      targetId: userRow.id,
    })
    clearCurrentSession()
    return { success: true as const }
  }

  changePassword(input: ChangePasswordInput): SessionInfo {
    const actor = this.requireCurrentUser()
    const parsed = changePasswordSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    const userRow = this.users.getAuthById(actor.id)
    if (!userRow?.password_hash || !verifySecret(parsed.data.currentPassword, userRow.password_hash)) {
      throw new AuthenticationError('La contrasena actual es invalida.')
    }

    this.users.setPassword(actor.id, hashSecret(parsed.data.newPassword), 0)
    const updatedUser = this.users.getById(actor.id)
    if (!updatedUser) {
      throw new NotFoundError('Usuario no encontrado.')
    }
    if (updatedUser.username === 'admin') {
      clearBootstrapInfoFile()
    }

    this.audit.create({
      actorEmployeeId: actor.id,
      action: 'user.password_changed',
      targetType: 'employee',
      targetId: actor.id,
    })

    return { user: this.buildAuthenticatedUser(updatedUser) }
  }

  replaceRecoveryCodes(userId: number, generatedByEmployeeId: number | null) {
    const recoveryCodes = randomRecoveryCodes()
    this.recoveryCodes.replaceForUser(
      userId,
      recoveryCodes.map((code, index) => ({ codeHash: sha256(code), label: `RC-${index + 1}` })),
      generatedByEmployeeId,
    )

    this.audit.create({
      actorEmployeeId: generatedByEmployeeId,
      action: 'user.recovery_codes_regenerated',
      targetType: 'employee',
      targetId: userId,
    })

    return recoveryCodes
  }

  private buildAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      ...user,
      permissions: buildPermissions(user.role),
    }
  }
}
