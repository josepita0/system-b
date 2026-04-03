import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { AuthService } from '../../src/main/services/authService'
import { SetupService } from '../../src/main/services/setupService'

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

    expect(service.verifyPassword({ password: bootstrapInfo!.temporaryPassword })).toEqual({ ok: true })
    expect(() => service.verifyPassword({ password: 'incorrecta' })).toThrow()
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
    expect(service.getBootstrapInfo()).toBeNull()
  })

  it('hides bootstrap info after the initial admin changes the password', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-auth-change-'))
    process.env.SYSTEM_BARRA_DATA_DIR = directory
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ directory, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const service = new AuthService(db)
    const bootstrapInfo = service.ensureInitialAdmin()!

    service.login({
      identifier: bootstrapInfo.username,
      password: bootstrapInfo.temporaryPassword,
    })

    const session = service.changePassword({
      currentPassword: bootstrapInfo.temporaryPassword,
      newPassword: 'ClaveAdminSegura123',
    })

    expect(session.user.mustChangePassword).toBe(0)
    expect(service.getBootstrapInfo()).toBeNull()
  })

  it('restaura wizard_required cuando el bootstrap sigue activo pero app_setup quedo desalineada', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-auth-align-'))
    process.env.SYSTEM_BARRA_DATA_DIR = directory
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ directory, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const auth = new AuthService(db)
    auth.ensureInitialAdmin()
    db.prepare('UPDATE app_setup_status SET wizard_required = 0 WHERE id = 1').run()

    const setup = new SetupService(db)
    expect(setup.getStatus().mustRunWizard).toBe(false)

    auth.ensureWizardAlignedWithBootstrap()
    expect(setup.getStatus().mustRunWizard).toBe(true)
  })
})
