import type { BootstrapAdminInfo, LoginInput, RecoverPasswordInput, SessionInfo } from '../types/auth'

export const authChannels = {
  login: 'auth:login',
  logout: 'auth:logout',
  me: 'auth:me',
  recoverPassword: 'auth:recoverPassword',
  bootstrapInfo: 'auth:bootstrapInfo',
} as const

export interface AuthApi {
  login: (payload: LoginInput) => Promise<SessionInfo>
  logout: () => Promise<{ success: true }>
  me: () => Promise<SessionInfo | null>
  recoverPassword: (payload: RecoverPasswordInput) => Promise<{ success: true }>
  bootstrapInfo: () => Promise<BootstrapAdminInfo | null>
}
