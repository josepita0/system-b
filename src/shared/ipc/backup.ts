import type { BackupInfo, BackupListResult, CreateBackupResult } from '../types/backup'

export const backupChannels = {
  create: 'backup:create',
  list: 'backup:list',
  restore: 'backup:restore',
  remove: 'backup:remove',
  export: 'backup:export',
  import: 'backup:import',
} as const

export interface BackupApi {
  create: () => Promise<CreateBackupResult>
  list: () => Promise<BackupListResult>
  restore: (backupId: string) => Promise<void>
  remove: (backupId: string) => Promise<void>
  export: (backupId: string) => Promise<{ exported: boolean; path?: string }>
  import: () => Promise<{ imported: boolean; backup?: BackupInfo }>
}
