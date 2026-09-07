import type Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import type { BackupInfo, BackupListResult, CreateBackupResult } from '../../shared/types/backup'
import { ValidationError } from '../errors'
import { getDataDirectory, getDatabasePath } from '../database/connection'

const BACKUP_DIR_NAME = 'backups'
const BACKUP_PREFIX = 'backup-'
const BACKUP_SUFFIX = '.sqlite'
const RESTORE_PENDING_FILE = 'restore-pending.sqlite'
const RESTORE_PENDING_MARKER = 'restore-pending.flag'

function getBackupsDirectory(): string {
  const dataDir = getDataDirectory()
  return path.join(dataDir, BACKUP_DIR_NAME)
}

function backupIdFromFilename(filename: string): string {
  return filename.replace(BACKUP_PREFIX, '').replace(BACKUP_SUFFIX, '')
}

function filenameFromBackupId(id: string): string {
  return `${BACKUP_PREFIX}${id}${BACKUP_SUFFIX}`
}

function formatBackupDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export class BackupService {
  constructor(private readonly db: Database.Database) {}

  async createBackup(): Promise<CreateBackupResult> {
    const backupsDir = getBackupsDirectory()
    fs.mkdirSync(backupsDir, { recursive: true })

    const now = new Date()
    const dateStr = formatBackupDate(now)
    const filename = `${BACKUP_PREFIX}${dateStr}${BACKUP_SUFFIX}`
    const destPath = path.join(backupsDir, filename)

    // better-sqlite3 backup() realiza un hot backup sin bloquear la DB
    await this.db.backup(destPath)

    const stat = fs.statSync(destPath)
    const info: BackupInfo = {
      id: backupIdFromFilename(filename),
      filename,
      createdAt: now.toISOString(),
      sizeBytes: stat.size,
    }

    return { backup: info }
  }

  listBackups(): BackupListResult {
    const backupsDir = getBackupsDirectory()

    if (!fs.existsSync(backupsDir)) {
      return { backups: [], totalSizeBytes: 0 }
    }

    const files = fs.readdirSync(backupsDir).filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_SUFFIX))

    const backups: BackupInfo[] = files.map((filename) => {
      const filePath = path.join(backupsDir, filename)
      const stat = fs.statSync(filePath)
      const id = backupIdFromFilename(filename)

      // Extraer fecha del nombre del archivo: backup-YYYYMMDD-HHmmss.sqlite
      const dateMatch = id.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/)
      let createdAt: string
      if (dateMatch) {
        const [, year, month, day, hour, min, sec] = dateMatch
        createdAt = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString()
      } else {
        createdAt = stat.mtime.toISOString()
      }

      return {
        id,
        filename,
        createdAt,
        sizeBytes: stat.size,
      }
    })

    // Ordenar por fecha descendente (más reciente primero)
    backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const totalSizeBytes = backups.reduce((sum, b) => sum + b.sizeBytes, 0)

    return { backups, totalSizeBytes }
  }

  scheduleRestore(backupId: string): void {
    if (!backupId || typeof backupId !== 'string') {
      throw new ValidationError('ID de backup inválido.')
    }

    const backupsDir = getBackupsDirectory()
    const filename = filenameFromBackupId(backupId)
    const backupPath = path.join(backupsDir, filename)

    if (!fs.existsSync(backupPath)) {
      throw new ValidationError(`No se encontró el backup "${filename}".`)
    }

    const dataDir = getDataDirectory()
    const pendingPath = path.join(dataDir, RESTORE_PENDING_FILE)
    const markerPath = path.join(dataDir, RESTORE_PENDING_MARKER)

    // Copiar el backup a un archivo temporal
    fs.copyFileSync(backupPath, pendingPath)

    // Crear el marker para indicar que hay una restauración pendiente
    fs.writeFileSync(markerPath, new Date().toISOString(), 'utf-8')
  }

  removeBackup(backupId: string): void {
    if (!backupId || typeof backupId !== 'string') {
      throw new ValidationError('ID de backup inválido.')
    }

    const backupsDir = getBackupsDirectory()
    const filename = filenameFromBackupId(backupId)
    const backupPath = path.join(backupsDir, filename)

    if (!fs.existsSync(backupPath)) {
      throw new ValidationError(`No se encontró el backup "${filename}".`)
    }

    fs.unlinkSync(backupPath)
  }

  getBackupPath(backupId: string): string {
    if (!backupId || typeof backupId !== 'string') {
      throw new ValidationError('ID de backup inválido.')
    }

    const backupsDir = getBackupsDirectory()
    const filename = filenameFromBackupId(backupId)
    const backupPath = path.join(backupsDir, filename)

    if (!fs.existsSync(backupPath)) {
      throw new ValidationError(`No se encontró el backup "${filename}".`)
    }

    return backupPath
  }

  importBackup(sourcePath: string): BackupInfo {
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new ValidationError('Ruta de origen inválida.')
    }

    if (!fs.existsSync(sourcePath)) {
      throw new ValidationError(`No se encontró el archivo "${sourcePath}".`)
    }

    const backupsDir = getBackupsDirectory()
    fs.mkdirSync(backupsDir, { recursive: true })

    // Generar nombre basado en timestamp
    const now = new Date()
    const dateStr = formatBackupDate(now)
    const filename = `${BACKUP_PREFIX}${dateStr}${BACKUP_SUFFIX}`
    const destPath = path.join(backupsDir, filename)

    // Copiar archivo
    fs.copyFileSync(sourcePath, destPath)

    const stat = fs.statSync(destPath)
    return {
      id: backupIdFromFilename(filename),
      filename,
      createdAt: now.toISOString(),
      sizeBytes: stat.size,
    }
  }
}

/**
 * Verifica si hay una restauración pendiente y la ejecuta.
 * Debe llamarse ANTES de abrir la base de datos.
 * Retorna true si se ejecutó una restauración, false si no había nada pendiente.
 */
export function executePendingRestore(): boolean {
  const dataDir = getDataDirectory()
  const pendingPath = path.join(dataDir, RESTORE_PENDING_FILE)
  const markerPath = path.join(dataDir, RESTORE_PENDING_MARKER)

  // Si no hay marker, no hay restauración pendiente
  if (!fs.existsSync(markerPath)) {
    return false
  }

  // Si no hay archivo pendiente, limpiar el marker y salir
  if (!fs.existsSync(pendingPath)) {
    fs.unlinkSync(markerPath)
    return false
  }

  const dbPath = getDatabasePath()

  // Asegurar que el directorio de la DB existe
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  // Copiar el archivo pendiente sobre la DB principal
  fs.copyFileSync(pendingPath, dbPath)

  // Eliminar archivos WAL y SHM si existen (pueden quedar de la sesión anterior)
  const walPath = dbPath + '-wal'
  const shmPath = dbPath + '-shm'
  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath)
  }
  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath)
  }

  // Limpiar el marker y el archivo pendiente
  fs.unlinkSync(markerPath)
  fs.unlinkSync(pendingPath)

  return true
}
