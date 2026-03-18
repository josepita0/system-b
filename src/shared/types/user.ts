export type UserRole = 'admin' | 'manager' | 'employee'

export interface User {
  id: number
  firstName: string
  lastName: string
  documentId: string | null
  email: string | null
  username: string | null
  role: UserRole
  isActive: number
  mustChangePassword: number
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthenticatedUser extends User {
  permissions: string[]
}

export interface CreateUserInput {
  firstName: string
  lastName: string
  documentId?: string | null
  email?: string | null
  username: string
  role: UserRole
}

export interface UpdateUserInput {
  id: number
  firstName: string
  lastName: string
  documentId?: string | null
  email?: string | null
  username: string
  role: UserRole
  isActive: boolean
}

export interface UserDocument {
  id: number
  employeeId: number
  documentType: string
  originalName: string
  mimeType: string
  uploadedAt: string
  expiresAt: string | null
}

export interface CreateUserResult {
  user: User
  temporaryPassword: string
  recoveryCodes: string[]
}
