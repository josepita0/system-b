import type { AuthenticatedUser, UserPermission, UserRole } from '../../shared/types/user'
import { AuthorizationError } from '../errors'

const roleRank: Record<UserRole, number> = {
  employee: 1,
  manager: 2,
  admin: 3,
}

export function hasAtLeastRole(currentRole: UserRole, requiredRole: UserRole) {
  return roleRank[currentRole] >= roleRank[requiredRole]
}

const rolePermissionMap: Record<UserRole, UserPermission> = {
  employee: 'users.manage_roles.employee',
  manager: 'users.manage_roles.manager',
  admin: 'users.manage_roles.admin',
}

export class AuthorizationService {
  requireRole(currentRole: UserRole, requiredRole: UserRole) {
    if (!hasAtLeastRole(currentRole, requiredRole)) {
      throw new AuthorizationError('No tiene permisos para realizar esta accion.')
    }
  }

  requirePermission(currentPermissions: UserPermission[], requiredPermission: UserPermission) {
    if (!currentPermissions.includes(requiredPermission)) {
      throw new AuthorizationError('No tiene permisos para realizar esta accion.')
    }
  }

  requireCanManageRole(actor: Pick<AuthenticatedUser, 'permissions'>, targetRole: UserRole) {
    const requiredPermission = rolePermissionMap[targetRole]
    if (!actor.permissions.includes(requiredPermission)) {
      throw new AuthorizationError('No puede administrar usuarios de este rol.')
    }
  }
}
