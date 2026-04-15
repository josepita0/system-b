import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { AuthService } from '../../src/main/services/authService'
import { SetupService } from '../../src/main/services/setupService'

const sendMailMock = vi.fn().mockResolvedValue({})

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: sendMailMock,
    }),
  },
}))

const cleanupQueue: Array<{ directory: string; close?: () => void }> = []

afterEach(() => {
  delete process.env.SYSTEM_BARRA_DATA_DIR
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    fs.rmSync(item.directory, { recursive: true, force: true })
  }
  sendMailMock.mockClear()
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

  it('resets password with an email code (6 digits) and enforces single-use + rate limit', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-auth-email-'))
    process.env.SYSTEM_BARRA_DATA_DIR = directory
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ directory, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    // SMTP minimal config (password en texto plano para tests)
    db.prepare(
      `UPDATE settings
       SET smtp_host = 'smtp.test',
           smtp_port = 587,
           smtp_user = 'no-reply@test.local',
           smtp_secure = 0,
           smtp_password = 'testpass'
       WHERE id = 1`,
    ).run()

    // Create user with email + password
    db.prepare(
      `INSERT INTO employees (first_name, last_name, email, username, role, password_hash, must_change_password)
       VALUES ('Bob', 'Email', 'bob@test.local', 'bob', 'employee', 'salt:hash', 0)`,
    ).run()

    const service = new AuthService(db)

    // request code
    expect(service.requestPasswordResetEmailCode({ identifier: 'bob' })).toEqual({ ok: true })
    expect(sendMailMock).toHaveBeenCalledTimes(1)

    const mailArgs = sendMailMock.mock.calls[0]?.[0] as { text?: string } | undefined
    const text = mailArgs?.text ?? ''
    const match = text.match(/Tu codigo es: (\d{6})/)
    expect(match?.[1]).toMatch(/^\d{6}$/)
    const code = match![1]

    // rate limit: second request immediately should fail
    expect(() => service.requestPasswordResetEmailCode({ identifier: 'bob' })).toThrow(/Espere un minuto/)

    // consume works once
    expect(service.resetPasswordWithEmailCode({ identifier: 'bob', code, newPassword: 'NuevaClaveSegura123' })).toEqual({ success: true })
    expect(() =>
      service.resetPasswordWithEmailCode({ identifier: 'bob', code, newPassword: 'OtraClaveSegura123' }),
    ).toThrow(/Codigo invalido o expirado/)
  })
})
