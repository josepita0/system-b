import { ipcMain } from 'electron'
import { documentChannels } from '../../shared/ipc/documents'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { DocumentService } from '../services/documentService'
import { executeIpc } from './response'

export function registerDocumentHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const service = new DocumentService(db, auth)

  ipcMain.handle(documentChannels.myDocuments, () => executeIpc(() => service.myDocuments()))
  ipcMain.handle(documentChannels.uploadForCurrentUser, (_event, documentType: string) =>
    executeIpc(() => service.uploadForCurrentUser(documentType)),
  )
  ipcMain.handle(documentChannels.remove, (_event, documentId: number) => executeIpc(() => service.remove(documentId)))
}
