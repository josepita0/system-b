import type { AuthenticatedUser } from './user'

export interface LoginInput {
  identifier: string
  password: string
}

export interface RecoverPasswordInput {
  identifier: string
  recoveryCode: string
  newPassword: string
}

export interface SessionInfo {
  user: AuthenticatedUser
}

export interface BootstrapAdminInfo {
  username: string
  temporaryPassword: string
  recoveryCodes: string[]
  filePath: string
}
