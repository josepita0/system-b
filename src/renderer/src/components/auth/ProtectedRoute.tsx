import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import type { UserRole } from '@shared/types/user'
import { useAuthStore } from '@renderer/store/authStore'

const roleRank: Record<UserRole, number> = {
  employee: 1,
  manager: 2,
  admin: 3,
}

interface ProtectedRouteProps {
  requiredRole?: UserRole
  children: ReactElement
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate replace to="/login" />
  }

  if (requiredRole && roleRank[user.role] < roleRank[requiredRole]) {
    return <Navigate replace to="/ventas" />
  }

  return children
}
