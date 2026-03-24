import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { UserRepository } from '../../src/main/repositories/userRepository'
import { hashSecret } from '../../src/main/security/password'
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

function setupServices(prefix: string) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  process.env.SYSTEM_BARRA_DATA_DIR = directory
  const dbPath = path.join(directory, 'test.sqlite')
  const db = createDatabase(dbPath)
  cleanupQueue.push({ directory, close: () => db.close() })

  runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
  return {
    db,
    auth: new AuthService(db),
    setup: new SetupService(db),
    users: new UserRepository(db),
  }
}

describe('SetupService', () => {
  it('requires the wizard for a fresh bootstrap installation', () => {
    const { auth, setup } = setupServices('barra-setup-fresh-')
    auth.ensureInitialAdmin()

    const status = setup.getStatus()

    expect(status.hasAdmin).toBe(true)
    expect(status.bootstrapPending).toBe(true)
    expect(status.bootstrapFilePath).toMatch(/initial-admin-access\.json$/)
    expect(status.mustRunWizard).toBe(true)
    expect(status.wizardRequired).toBe(true)
  })

  it('marks installation as completed after password change', () => {
    const { auth, setup } = setupServices('barra-setup-complete-')
    const bootstrap = auth.ensureInitialAdmin()!

    auth.login({
      identifier: bootstrap.username,
      password: bootstrap.temporaryPassword,
    })

    auth.changePassword({
      currentPassword: bootstrap.temporaryPassword,
      newPassword: 'ClaveFinalSegura123',
    })

    const actor = auth.getCurrentUser()!
    setup.complete(actor.id)

    const status = setup.getStatus()
    expect(status.bootstrapPending).toBe(false)
    expect(status.mustRunWizard).toBe(false)
    expect(status.completedAt).not.toBeNull()
    expect(status.completedByEmployeeId).toBe(actor.id)
  })

  it('does not force the wizard for a legacy install without bootstrap pending', () => {
    const { setup, users } = setupServices('barra-setup-legacy-')

    users.create({
      firstName: 'Admin',
      lastName: 'Existente',
      documentId: null,
      email: null,
      username: 'admin',
      role: 'admin',
      passwordHash: hashSecret('ClaveExistente123'),
      mustChangePassword: 0,
    })

    const status = setup.getStatus()
    expect(status.hasAdmin).toBe(true)
    expect(status.bootstrapPending).toBe(false)
    expect(status.mustRunWizard).toBe(false)
    expect(status.wizardRequired).toBe(false)
  })
})
