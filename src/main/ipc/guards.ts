import type { UserPermission, UserRole } from '../../shared/types/user'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'

export function createIpcGuards(auth: AuthService, authorization = new AuthorizationService()) {
  return {
    requireUser() {
      return auth.requireCurrentUser()
    },
    requireRole(requiredRole: UserRole) {
      const actor = auth.requireCurrentUser()
      authorization.requireRole(actor.role, requiredRole)
      return actor
    },
    requirePermission(requiredPermission: UserPermission) {
      const actor = auth.requireCurrentUser()
      authorization.requirePermission(actor.permissions, requiredPermission)
      return actor
    },
  }
}
