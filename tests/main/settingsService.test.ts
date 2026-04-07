import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { SettingsService } from '../../src/main/services/settingsService'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  vi.unstubAllEnvs()
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    fs.rmSync(path.dirname(item.filePath), { recursive: true, force: true })
  }
})

describe('SettingsService SMTP', () => {
  it('getSmtpSettingsPublic masks password and detects env override', () => {
    vi.stubEnv('SYSTEM_BARRA_SMTP_PASSWORD', 'secret-env')
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-settings-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    db.prepare('UPDATE settings SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?, smtp_secure = 0 WHERE id = 1').run(
      'smtp.example.com',
      587,
      'user@example.com',
      'plain-pass',
    )

    const service = new SettingsService(db)
    const pub = service.getSmtpSettingsPublic()
    expect(pub.smtpHost).toBe('smtp.example.com')
    expect(pub.smtpPort).toBe(587)
    expect(pub.smtpUser).toBe('user@example.com')
    expect(pub.passwordConfigured).toBe(true)
    expect(pub.passwordFromEnv).toBe(true)
  })

  it('updateSmtpSettings encrypts new password', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-settings-upd-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const service = new SettingsService(db)
    service.updateSmtpSettings({
      smtpHost: 'h',
      smtpPort: 465,
      smtpUser: 'u',
      smtpSecure: true,
      reportRecipientEmail: null,
      smtpPassword: 'new-secret',
    })

    const row = db.prepare('SELECT smtp_password, smtp_secure FROM settings WHERE id = 1').get() as {
      smtp_password: string
      smtp_secure: number
    }
    expect(row.smtp_secure).toBe(1)
    expect(row.smtp_password.startsWith('enc:')).toBe(true)
  })
})

describe('SettingsService Cash', () => {
  it('reads cash settings with default value', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-settings-cash-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const service = new SettingsService(db)
    const pub = service.getCashSettingsPublic()
    expect(pub.minOpeningCash).toBeGreaterThanOrEqual(0)
  })

  it('updates cash settings', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-settings-cash-upd-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const service = new SettingsService(db)
    service.updateCashSettings({ minOpeningCash: 25 })

    const row = db.prepare('SELECT min_opening_cash FROM settings WHERE id = 1').get() as { min_opening_cash: number }
    expect(row.min_opening_cash).toBe(25)
  })
})
