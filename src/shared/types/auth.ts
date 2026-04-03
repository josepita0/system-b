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

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

/** Confirmar acciones sensibles con la contrasena del usuario en sesion. */
export interface VerifyPasswordInput {
  password: string
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
