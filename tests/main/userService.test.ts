import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { AuthService } from '../../src/main/services/authService'
import { UserService } from '../../src/main/services/userService'

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
  const auth = new AuthService(db)
  const users = new UserService(db, auth)

  return { db, auth, users }
}

describe('UserService security boundaries', () => {
  it('limits manager to employee profiles and blocks credential issuance', () => {
    const { auth, users } = setupServices('barra-users-manager-')
    const bootstrap = auth.ensureInitialAdmin()!

    auth.login({
      identifier: bootstrap.username,
      password: bootstrap.temporaryPassword,
    })

    const manager = users.create({
      firstName: 'Maria',
      lastName: 'Encargada',
      username: 'maria.manager',
      role: 'manager',
    }).user

    const managerCredentials = users.issueCredentials(manager.id)
    auth.login({
      identifier: manager.username!,
      password: managerCredentials.temporaryPassword,
    })

    const createdEmployee = users.create({
      firstName: 'Luis',
      lastName: 'Empleado',
      username: 'luis.employee',
      role: 'employee',
    })

    expect(Object.keys(createdEmployee)).toEqual(['user'])
    expect(createdEmployee.user.role).toBe('employee')
    expect(users.list().every((user) => user.role === 'employee')).toBe(true)
    expect(() => users.getById(manager.id)).toThrowError(/No puede administrar usuarios de este rol/)
    expect(() =>
      users.create({
        firstName: 'Ana',
        lastName: 'OtraEncargada',
        username: 'ana.manager',
        role: 'manager',
      }),
    ).toThrowError(/No puede administrar usuarios de este rol/)
    expect(() => users.issueCredentials(createdEmployee.user.id)).toThrowError(/No tiene permisos/)
  })

  it('forces password change after issuing credentials and records audit logs', () => {
    const { db, auth, users } = setupServices('barra-users-credentials-')
    const bootstrap = auth.ensureInitialAdmin()!

    auth.login({
      identifier: bootstrap.username,
      password: bootstrap.temporaryPassword,
    })

    const employee = users.create({
      firstName: 'Laura',
      lastName: 'Cajera',
      username: 'laura.employee',
      role: 'employee',
    }).user

    const issuedCredentials = users.issueCredentials(employee.id)
    expect(issuedCredentials.user.mustChangePassword).toBe(1)
    expect(issuedCredentials.recoveryCodes).toHaveLength(8)

    const session = auth.login({
      identifier: employee.username!,
      password: issuedCredentials.temporaryPassword,
    })
    expect(session.user.mustChangePassword).toBe(1)

    const changedSession = auth.changePassword({
      currentPassword: issuedCredentials.temporaryPassword,
      newPassword: 'NuevaClaveSegura123',
    })
    expect(changedSession.user.mustChangePassword).toBe(0)
    expect(auth.getCurrentUser()?.mustChangePassword).toBe(0)

    const actions = db
      .prepare('SELECT action FROM audit_logs ORDER BY id ASC')
      .all() as Array<{ action: string }>

    expect(actions.map((item) => item.action)).toContain('user.created')
    expect(actions.map((item) => item.action)).toContain('user.credentials_issued')
    expect(actions.map((item) => item.action)).toContain('user.recovery_codes_regenerated')
    expect(actions.map((item) => item.action)).toContain('user.password_changed')
  })
})
