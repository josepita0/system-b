export interface BackupInfo {
  id: string
  filename: string
  createdAt: string // ISO date
  sizeBytes: number
}

export interface BackupListResult {
  backups: BackupInfo[]
  totalSizeBytes: number
}

export interface CreateBackupResult {
  backup: BackupInfo
}
