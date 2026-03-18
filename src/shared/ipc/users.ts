import type { CreateUserInput, CreateUserResult, UpdateUserInput, User } from '../types/user'

export const userChannels = {
  list: 'users:list',
  create: 'users:create',
  update: 'users:update',
  myProfile: 'users:myProfile',
  regenerateRecoveryCodes: 'users:regenerateRecoveryCodes',
} as const

export interface UserApi {
  list: () => Promise<User[]>
  create: (payload: CreateUserInput) => Promise<CreateUserResult>
  update: (payload: UpdateUserInput) => Promise<User>
  myProfile: () => Promise<User>
  regenerateRecoveryCodes: (userId: number) => Promise<string[]>
}
