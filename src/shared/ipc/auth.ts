import type {
  ChangePasswordInput,
  LoginInput,
  RecoverPasswordInput,
  RequestPasswordResetEmailCodeInput,
  ResetPasswordWithEmailCodeInput,
  SessionInfo,
  VerifyPasswordInput,
} from '../types/auth'

export const authChannels = {
  login: 'auth:login',
  logout: 'auth:logout',
  me: 'auth:me',
  changePassword: 'auth:changePassword',
  recoverPassword: 'auth:recoverPassword',
  requestPasswordResetEmailCode: 'auth:requestPasswordResetEmailCode',
  resetPasswordWithEmailCode: 'auth:resetPasswordWithEmailCode',
  verifyPassword: 'auth:verifyPassword',
} as const

export interface AuthApi {
  login: (payload: LoginInput) => Promise<SessionInfo>
  logout: () => Promise<{ success: true }>
  me: () => Promise<SessionInfo | null>
  changePassword: (payload: ChangePasswordInput) => Promise<SessionInfo>
  recoverPassword: (payload: RecoverPasswordInput) => Promise<{ success: true }>
  requestPasswordResetEmailCode: (payload: RequestPasswordResetEmailCodeInput) => Promise<{ ok: true }>
  resetPasswordWithEmailCode: (payload: ResetPasswordWithEmailCodeInput) => Promise<{ success: true }>
  verifyPassword: (payload: VerifyPasswordInput) => Promise<{ ok: true }>
}
