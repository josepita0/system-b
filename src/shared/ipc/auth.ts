import type { ChangePasswordInput, LoginInput, RecoverPasswordInput, SessionInfo } from '../types/auth'

export const authChannels = {
  login: 'auth:login',
  logout: 'auth:logout',
  me: 'auth:me',
  changePassword: 'auth:changePassword',
  recoverPassword: 'auth:recoverPassword',
} as const

export interface AuthApi {
  login: (payload: LoginInput) => Promise<SessionInfo>
  logout: () => Promise<{ success: true }>
  me: () => Promise<SessionInfo | null>
  changePassword: (payload: ChangePasswordInput) => Promise<SessionInfo>
  recoverPassword: (payload: RecoverPasswordInput) => Promise<{ success: true }>
}
