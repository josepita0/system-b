import type { UserDocument } from '../types/user'

export const documentChannels = {
  myDocuments: 'documents:myDocuments',
  uploadForCurrentUser: 'documents:uploadForCurrentUser',
  remove: 'documents:remove',
} as const

export interface DocumentApi {
  myDocuments: () => Promise<UserDocument[]>
  uploadForCurrentUser: (documentType: string) => Promise<UserDocument>
  remove: (documentId: number) => Promise<{ success: true }>
}
