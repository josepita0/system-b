import type { CreateUserInput, CreateUserResult, IssueUserCredentialsResult, UpdateUserInput, User } from '../types/user'

export const userChannels = {
  list: 'users:list',
  getById: 'users:getById',
  create: 'users:create',
  update: 'users:update',
  myProfile: 'users:myProfile',
  issueCredentials: 'users:issueCredentials',
  regenerateRecoveryCodes: 'users:regenerateRecoveryCodes',
} as const

export interface UserApi {
  list: () => Promise<User[]>
  getById: (id: number) => Promise<User | null>
  create: (payload: CreateUserInput) => Promise<CreateUserResult>
  update: (payload: UpdateUserInput) => Promise<User>
  myProfile: () => Promise<User>
  issueCredentials: (userId: number) => Promise<IssueUserCredentialsResult>
  regenerateRecoveryCodes: (userId: number) => Promise<string[]>
}
