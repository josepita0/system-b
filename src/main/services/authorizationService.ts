import type { UserRole } from '../../shared/types/user'
import { AuthorizationError } from '../errors'

const roleRank: Record<UserRole, number> = {
  employee: 1,
  manager: 2,
  admin: 3,
}

export function hasAtLeastRole(currentRole: UserRole, requiredRole: UserRole) {
  return roleRank[currentRole] >= roleRank[requiredRole]
}

export class AuthorizationService {
  requireRole(currentRole: UserRole, requiredRole: UserRole) {
    if (!hasAtLeastRole(currentRole, requiredRole)) {
      throw new AuthorizationError('No tiene permisos para realizar esta accion.')
    }
  }

  requireCanManageRole(actorRole: UserRole, targetRole: UserRole) {
    if (!hasAtLeastRole(actorRole, targetRole)) {
      throw new AuthorizationError('No puede administrar usuarios de un rol superior.')
    }
  }
}
