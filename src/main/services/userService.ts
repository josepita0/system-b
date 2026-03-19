import type Database from 'better-sqlite3'
import type { CreateUserInput, UpdateUserInput } from '../../shared/types/user'
import { createUserSchema, updateUserSchema } from '../../shared/schemas/userSchema'
import { ConflictError, NotFoundError, ValidationError } from '../errors'
import { AuditLogRepository } from '../repositories/auditLogRepository'
import { UserRepository } from '../repositories/userRepository'
import { randomSecret, hashSecret } from '../security/password'
import { AuthorizationService } from './authorizationService'
import { AuthService } from './authService'

export class UserService {
  private readonly users: UserRepository
  private readonly authorization: AuthorizationService
  private readonly audit: AuditLogRepository

  constructor(private readonly db: Database.Database, private readonly auth: AuthService) {
    this.users = new UserRepository(db)
    this.authorization = new AuthorizationService()
    this.audit = new AuditLogRepository(db)
  }

  list() {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requirePermission(actor.permissions, 'users.manage_profiles')
    return this.users.list().filter((user) => actor.permissions.includes(`users.manage_roles.${user.role}`))
  }

  getById(id: number) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requirePermission(actor.permissions, 'users.manage_profiles')
    const user = this.users.getById(id)
    if (!user) {
      throw new NotFoundError('Usuario no encontrado.')
    }

    this.authorization.requireCanManageRole(actor, user.role)
    return user
  }

  myProfile() {
    return this.auth.requireCurrentUser()
  }

  create(input: CreateUserInput) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requirePermission(actor.permissions, 'users.manage_profiles')

    const parsed = createUserSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    this.authorization.requireCanManageRole(actor, parsed.data.role)

    if (this.users.getAuthByIdentifier(parsed.data.username)) {
      throw new ConflictError('El nombre de usuario ya existe.')
    }

    if (parsed.data.email && this.users.getAuthByIdentifier(parsed.data.email)) {
      throw new ConflictError('El correo ya existe.')
    }

    const user = this.users.create({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      documentId: parsed.data.documentId ?? null,
      email: parsed.data.email ?? null,
      username: parsed.data.username,
      role: parsed.data.role,
      passwordHash: null,
      mustChangePassword: 1,
    })

    this.audit.create({
      actorEmployeeId: actor.id,
      action: 'user.created',
      targetType: 'employee',
      targetId: user.id,
      details: {
        role: user.role,
      },
    })

    return { user }
  }

  update(input: UpdateUserInput) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requirePermission(actor.permissions, 'users.manage_profiles')

    const parsed = updateUserSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    const existing = this.users.getById(parsed.data.id)
    if (!existing) {
      throw new NotFoundError('Usuario no encontrado.')
    }

    this.authorization.requireCanManageRole(actor, existing.role)
    this.authorization.requireCanManageRole(actor, parsed.data.role)

    const byUsername = this.users.getAuthByIdentifier(parsed.data.username)
    if (byUsername && byUsername.id !== parsed.data.id) {
      throw new ConflictError('El nombre de usuario ya existe.')
    }

    if (parsed.data.email) {
      const byEmail = this.users.getAuthByIdentifier(parsed.data.email)
      if (byEmail && byEmail.id !== parsed.data.id) {
        throw new ConflictError('El correo ya existe.')
      }
    }

    const updated = this.users.update({
      id: parsed.data.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      documentId: parsed.data.documentId ?? null,
      email: parsed.data.email ?? null,
      username: parsed.data.username,
      role: parsed.data.role,
      isActive: parsed.data.isActive ? 1 : 0,
    })

    this.audit.create({
      actorEmployeeId: actor.id,
      action: 'user.updated',
      targetType: 'employee',
      targetId: updated.id,
      details: {
        role: updated.role,
        isActive: Boolean(updated.isActive),
      },
    })

    return updated
  }

  issueCredentials(userId: number) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requirePermission(actor.permissions, 'users.manage_credentials')
    const target = this.users.getById(userId)
    if (!target) {
      throw new NotFoundError('Usuario no encontrado.')
    }

    this.authorization.requireCanManageRole(actor, target.role)

    const temporaryPassword = randomSecret(12)
    this.users.setPassword(userId, hashSecret(temporaryPassword), 1)
    const recoveryCodes = this.auth.replaceRecoveryCodes(userId, actor.id)
    const user = this.users.getById(userId)!

    this.audit.create({
      actorEmployeeId: actor.id,
      action: 'user.credentials_issued',
      targetType: 'employee',
      targetId: userId,
      details: {
        role: user.role,
      },
    })

    return { user, temporaryPassword, recoveryCodes }
  }

  regenerateRecoveryCodes(userId: number) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requirePermission(actor.permissions, 'users.manage_credentials')
    const target = this.users.getById(userId)
    if (!target) {
      throw new NotFoundError('Usuario no encontrado.')
    }

    this.authorization.requireCanManageRole(actor, target.role)
    return this.auth.replaceRecoveryCodes(userId, actor.id)
  }
}
