import type { User, UserRole } from '@shared/types/user'

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Encargada',
  employee: 'Empleado',
}

export function formatUserRole(role: User['role']) {
  return roleLabels[role]
}

export function formatUserStatus(isActive: User['isActive']) {
  return isActive ? 'Activo' : 'Inactivo'
}

export function formatUserDate(value: string | null) {
  if (!value) {
    return 'Sin registro'
  }

  return new Date(value).toLocaleString('es-ES')
}
