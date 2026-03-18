import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { AuthService } from '../../src/main/services/authService'

const cleanupQueue: Array<{ directory: string; close?: () => void }> = []

afterEach(() => {
  delete process.env.SYSTEM_BARRA_DATA_DIR
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    fs.rmSync(item.directory, { recursive: true, force: true })
  }
})

describe('AuthService', () => {
  it('bootstraps the initial admin and allows login', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-auth-'))
    process.env.SYSTEM_BARRA_DATA_DIR = directory
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ directory, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const service = new AuthService(db)
    const bootstrapInfo = service.ensureInitialAdmin()

    expect(bootstrapInfo?.username).toBe('admin')
    const session = service.login({
      identifier: bootstrapInfo!.username,
      password: bootstrapInfo!.temporaryPassword,
    })

    expect(session.user.role).toBe('admin')
    expect(service.getCurrentUser()?.username).toBe('admin')
  })

  it('resets password with a personal recovery code', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-auth-recover-'))
    process.env.SYSTEM_BARRA_DATA_DIR = directory
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ directory, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const service = new AuthService(db)
    const bootstrapInfo = service.ensureInitialAdmin()!

    service.recoverPassword({
      identifier: bootstrapInfo.username,
      recoveryCode: bootstrapInfo.recoveryCodes[0],
      newPassword: 'NuevaContrasena123',
    })

    const session = service.login({
      identifier: bootstrapInfo.username,
      password: 'NuevaContrasena123',
    })

    expect(session.user.username).toBe('admin')
  })
})
