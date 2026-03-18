import fs from 'node:fs'
import path from 'node:path'
import { app, dialog } from 'electron'
import type Database from 'better-sqlite3'
import { AuthorizationError, NotFoundError } from '../errors'
import { DocumentRepository } from '../repositories/documentRepository'
import { encryptJson } from '../security/encryption'
import { AuthService } from './authService'

const defaultMimeByExtension: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

export class DocumentService {
  private readonly documents: DocumentRepository

  constructor(private readonly db: Database.Database, private readonly auth: AuthService) {
    this.documents = new DocumentRepository(db)
  }

  myDocuments() {
    const actor = this.auth.requireCurrentUser()
    if (actor.role === 'admin') {
      throw new AuthorizationError('El Administrador no gestiona documentacion personal.')
    }
    return this.documents.listByEmployee(actor.id)
  }

  async uploadForCurrentUser(documentType: string) {
    const actor = this.auth.requireCurrentUser()
    if (actor.role === 'admin') {
      throw new AuthorizationError('El Administrador no gestiona documentacion personal.')
    }

    const result = await dialog.showOpenDialog({
      title: 'Seleccionar documento',
      properties: ['openFile'],
      filters: [{ name: 'Documentos', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }],
    })

    if (result.canceled || result.filePaths.length === 0) {
      throw new AuthorizationError('No se selecciono ningun documento.')
    }

    const sourcePath = result.filePaths[0]
    const extension = path.extname(sourcePath).toLowerCase()
    const targetDir = path.join(app.getPath('userData'), 'documents', String(actor.id))
    fs.mkdirSync(targetDir, { recursive: true })
    const targetPath = path.join(targetDir, `${Date.now()}-${path.basename(sourcePath)}`)
    fs.copyFileSync(sourcePath, targetPath)

    return this.documents.create({
      employeeId: actor.id,
      documentType,
      filePath: targetPath,
      originalName: path.basename(sourcePath),
      mimeType: defaultMimeByExtension[extension] ?? 'application/octet-stream',
      encryptedMetadata: encryptJson({
        sourcePath,
        targetPath,
        uploadedBy: actor.id,
      }),
      expiresAt: null,
    })
  }

  remove(documentId: number) {
    const actor = this.auth.requireCurrentUser()
    const document = this.documents.getRawById(documentId)
    if (!document) {
      throw new NotFoundError('Documento no encontrado.')
    }

    if (document.employee_id !== actor.id) {
      throw new AuthorizationError('No puede eliminar documentacion de otro usuario.')
    }

    if (fs.existsSync(document.file_path)) {
      fs.rmSync(document.file_path, { force: true })
    }

    this.documents.remove(documentId)
    return { success: true as const }
  }
}
