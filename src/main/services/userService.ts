import type Database from 'better-sqlite3'
import type { CreateUserInput, UpdateUserInput } from '../../shared/types/user'
import { createUserSchema, updateUserSchema } from '../../shared/schemas/userSchema'
import { ConflictError, NotFoundError, ValidationError } from '../errors'
import { UserRepository } from '../repositories/userRepository'
import { randomSecret, hashSecret } from '../security/password'
import { AuthorizationService } from './authorizationService'
import { AuthService } from './authService'

export class UserService {
  private readonly users: UserRepository
  private readonly authorization: AuthorizationService

  constructor(private readonly db: Database.Database, private readonly auth: AuthService) {
    this.users = new UserRepository(db)
    this.authorization = new AuthorizationService()
  }

  list() {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requireRole(actor.role, 'manager')
    return this.users.list()
  }

  getById(id: number) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requireRole(actor.role, 'manager')
    const user = this.users.getById(id)
    if (!user) {
      throw new NotFoundError('Usuario no encontrado.')
    }

    this.authorization.requireCanManageRole(actor.role, user.role)
    return user
  }

  myProfile() {
    return this.auth.requireCurrentUser()
  }

  create(input: CreateUserInput) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requireRole(actor.role, 'manager')

    const parsed = createUserSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    this.authorization.requireCanManageRole(actor.role, parsed.data.role)

    if (this.users.getAuthByIdentifier(parsed.data.username)) {
      throw new ConflictError('El nombre de usuario ya existe.')
    }

    if (parsed.data.email && this.users.getAuthByIdentifier(parsed.data.email)) {
      throw new ConflictError('El correo ya existe.')
    }

    const temporaryPassword = randomSecret(12)
    const user = this.users.create({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      documentId: parsed.data.documentId ?? null,
      email: parsed.data.email ?? null,
      username: parsed.data.username,
      role: parsed.data.role,
      passwordHash: hashSecret(temporaryPassword),
      mustChangePassword: 1,
    })

    const recoveryCodes = this.auth.replaceRecoveryCodes(user.id, actor.id)
    return { user, temporaryPassword, recoveryCodes }
  }

  update(input: UpdateUserInput) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requireRole(actor.role, 'manager')

    const parsed = updateUserSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    const existing = this.users.getById(parsed.data.id)
    if (!existing) {
      throw new NotFoundError('Usuario no encontrado.')
    }

    this.authorization.requireCanManageRole(actor.role, existing.role)
    this.authorization.requireCanManageRole(actor.role, parsed.data.role)

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

    return this.users.update({
      id: parsed.data.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      documentId: parsed.data.documentId ?? null,
      email: parsed.data.email ?? null,
      username: parsed.data.username,
      role: parsed.data.role,
      isActive: parsed.data.isActive ? 1 : 0,
    })
  }

  regenerateRecoveryCodes(userId: number) {
    const actor = this.auth.requireCurrentUser()
    this.authorization.requireRole(actor.role, 'manager')
    const target = this.users.getById(userId)
    if (!target) {
      throw new NotFoundError('Usuario no encontrado.')
    }

    this.authorization.requireCanManageRole(actor.role, target.role)
    return this.auth.replaceRecoveryCodes(userId, actor.id)
  }
}
