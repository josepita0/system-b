import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { AuthService } from '../../src/main/services/authService'
import { LicenseService } from '../../src/main/services/licenseService'

const cleanupQueue: Array<{ directory: string; close?: () => void }> = []

afterEach(() => {
  delete process.env.SYSTEM_BARRA_DATA_DIR
  delete process.env.SYSTEM_BARRA_LICENSE_PANEL_SECRET
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    fs.rmSync(item.directory, { recursive: true, force: true })
  }
})

function setupServices(prefix: string) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  process.env.SYSTEM_BARRA_DATA_DIR = directory
  process.env.SYSTEM_BARRA_LICENSE_PANEL_SECRET = 'TEST-LICENSE-SECRET'
  const dbPath = path.join(directory, 'test.sqlite')
  const db = createDatabase(dbPath)
  cleanupQueue.push({ directory, close: () => db.close() })

  runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
  const auth = new AuthService(db)
  const license = new LicenseService(db)

  return { db, auth, license }
}

describe('LicenseService', () => {
  it('starts without an active license and blocks report generation', () => {
    const { db, auth, license } = setupServices('barra-license-missing-')
    const bootstrap = auth.ensureInitialAdmin()!
    auth.login({
      identifier: bootstrap.username,
      password: bootstrap.temporaryPassword,
    })

    const actor = auth.getCurrentUser()!
    const status = license.getStatus()
    expect(status.status).toBe('missing')
    expect(license.getFeatureFlags().reportPdfEnabled).toBe(false)
    expect(() => license.assertFeatureEnabled('reports.generate_pdf', actor.id)).toThrowError(/No hay una licencia registrada/)

    const actions = db.prepare('SELECT action FROM audit_logs ORDER BY id ASC').all() as Array<{ action: string }>
    expect(actions.map((item) => item.action)).toContain('license.blocked_feature_attempt')
  })

  it('validates panel access with a temporary code when env secret is unset', () => {
    const { auth, license } = setupServices('barra-license-temp-panel-')
    delete process.env.SYSTEM_BARRA_LICENSE_PANEL_SECRET
    const bootstrap = auth.ensureInitialAdmin()!
    auth.login({
      identifier: bootstrap.username,
      password: bootstrap.temporaryPassword,
    })

    const actor = auth.getCurrentUser()!
    const issued = license.generateTemporaryPanelCode(actor.id, actor.id)
    expect(issued.code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)

    const access = license.validateSecretAccess(actor.id, { secret: issued.code })
    expect(access.accessToken).toBeTruthy()

    expect(() => license.validateSecretAccess(actor.id, { secret: issued.code })).toThrowError(/invalida/i)
  })

  it('validates secret access and activates a key-based license', () => {
    const { db, auth, license } = setupServices('barra-license-key-')
    const bootstrap = auth.ensureInitialAdmin()!
    auth.login({
      identifier: bootstrap.username,
      password: bootstrap.temporaryPassword,
    })

    const actor = auth.getCurrentUser()!
    const access = license.validateSecretAccess(actor.id, { secret: 'TEST-LICENSE-SECRET' })
    const accessMinutes = (new Date(access.expiresAt).getTime() - Date.now()) / (60 * 1000)
    const status = license.activateByKey(actor.id, {
      accessToken: access.accessToken,
      licenseKey: 'SB-2026-ADMIN-001',
      planType: 'annual',
      issuedTo: 'Salon Principal',
    })

    expect(accessMinutes).toBeGreaterThan(4)
    expect(accessMinutes).toBeLessThanOrEqual(5.1)
    expect(status.status).toBe('active')
    expect(status.activationMode).toBe('key')
    expect(status.planType).toBe('annual')
    expect(status.issuedTo).toBe('Salon Principal')

    const actions = db.prepare('SELECT action FROM audit_logs ORDER BY id ASC').all() as Array<{ action: string }>
    expect(actions.map((item) => item.action)).toContain('license.secret_access_validated')
    expect(actions.map((item) => item.action)).toContain('license.activated_by_key')
  })

  it('renews the current license through the manual path', () => {
    const { db, auth, license } = setupServices('barra-license-renew-')
    const bootstrap = auth.ensureInitialAdmin()!
    auth.login({
      identifier: bootstrap.username,
      password: bootstrap.temporaryPassword,
    })

    const actor = auth.getCurrentUser()!
    const access = license.validateSecretAccess(actor.id, { secret: 'TEST-LICENSE-SECRET' })
    license.activateManual(actor.id, {
      accessToken: access.accessToken,
      planType: 'monthly',
      notes: 'Activacion inicial',
    })

    const renewed = license.renew(actor.id, {
      accessToken: access.accessToken,
      mode: 'manual',
      planType: 'annual',
      notes: 'Renovacion soporte',
    })

    expect(renewed.status).toBe('active')
    expect(renewed.activationMode).toBe('manual')
    expect(renewed.planType).toBe('annual')
    expect(renewed.notes).toBe('Renovacion soporte')

    const actions = db.prepare('SELECT action FROM audit_logs ORDER BY id ASC').all() as Array<{ action: string }>
    expect(actions.map((item) => item.action)).toContain('license.renewed')
  })

  it('cancels the current license and blocks gated features', () => {
    const { db, auth, license } = setupServices('barra-license-cancel-')
    const bootstrap = auth.ensureInitialAdmin()!
    auth.login({
      identifier: bootstrap.username,
      password: bootstrap.temporaryPassword,
    })

    const actor = auth.getCurrentUser()!
    const access = license.validateSecretAccess(actor.id, { secret: 'TEST-LICENSE-SECRET' })
    license.activateManual(actor.id, {
      accessToken: access.accessToken,
      planType: 'monthly',
      issuedTo: 'Salon X7',
    })

    const cancelled = license.cancel(actor.id, {
      accessToken: access.accessToken,
      notes: 'Licencia revocada por solicitud',
    })

    expect(cancelled.status).toBe('suspended')
    expect(cancelled.issuedTo).toBe('Salon X7')
    expect(cancelled.notes).toBe('Licencia revocada por solicitud')
    expect(license.getFeatureFlags().reportEmailEnabled).toBe(false)
    expect(() => license.assertFeatureEnabled('reports.retry_email', actor.id)).toThrowError(/licencia/i)

    const actions = db.prepare('SELECT action FROM audit_logs ORDER BY id ASC').all() as Array<{ action: string }>
    expect(actions.map((item) => item.action)).toContain('license.cancelled')
  })
})
