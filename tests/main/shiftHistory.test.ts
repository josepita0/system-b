import fs from 'node:fs'
import os from 'node:os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { ShiftRepository } from '../../src/main/repositories/shiftRepository'
import { hasAtLeastRole } from '../../src/main/services/authorizationService'
import { ShiftService } from '../../src/main/services/shiftService'
import type { AuthenticatedUser } from '../../src/shared/types/user'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    const filePath = item.filePath
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
  }
})

function mockUser(id: number, role: AuthenticatedUser['role']): AuthenticatedUser {
  return {
    id,
    firstName: 'T',
    lastName: 'U',
    documentId: null,
    email: null,
    username: 'u',
    role,
    isActive: 1,
    mustChangePassword: 0,
    lastLoginAt: null,
    createdAt: '',
    updatedAt: '',
    permissions: [],
  }
}

describe('Shift history and visibility', () => {
  it('latest closed session id is the most recent by closed_at', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-shifthist-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const repo = new ShiftRepository(db)
    const u1 = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('A','A','employee',1)`).run()
        .lastInsertRowid,
    )

    const s1 = repo.createSession(1, '2026-03-20', 0, u1)
    db.prepare(`UPDATE cash_sessions SET status = 'closed', closed_at = '2026-03-20T08:00:00', pending_reconcile_total = 0 WHERE id = ?`).run(
      s1.id,
    )
    const s2 = repo.createSession(1, '2026-03-20', 0, u1)
    db.prepare(`UPDATE cash_sessions SET status = 'closed', closed_at = '2026-03-20T10:00:00', pending_reconcile_total = 0 WHERE id = ?`).run(
      s2.id,
    )

    expect(repo.getLatestClosedSessionId()).toBe(s2.id)
  })

  it('employee eligible list excludes pending reconcile and open tabs originated in session', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-shifthist-elig-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const repo = new ShiftRepository(db)
    const emp = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('E','E','employee',1)`).run()
        .lastInsertRowid,
    )

    const ok = repo.createSession(1, '2026-03-20', 0, emp)
    db.prepare(
      `UPDATE cash_sessions SET status = 'closed', closed_at = '2026-03-20T09:00:00', pending_reconcile_total = 0 WHERE id = ?`,
    ).run(ok.id)

    const badPending = repo.createSession(1, '2026-03-20', 0, emp)
    db.prepare(
      `UPDATE cash_sessions SET status = 'closed', closed_at = '2026-03-20T09:30:00', pending_reconcile_total = 50 WHERE id = ?`,
    ).run(badPending.id)

    const badTab = repo.createSession(1, '2026-03-20', 0, emp)
    db.prepare(
      `UPDATE cash_sessions SET status = 'closed', closed_at = '2026-03-20T09:45:00', pending_reconcile_total = 0 WHERE id = ?`,
    ).run(badTab.id)
    db.prepare(
      `INSERT INTO customer_tabs (customer_name, status, opened_cash_session_id, opened_by_employee_id)
       VALUES ('Cliente', 'open', ?, ?)`,
    ).run(badTab.id, emp)

    const ids = repo.listEmployeeEligibleSessionIds(emp)
    expect(ids).toContain(ok.id)
    expect(ids).not.toContain(badPending.id)
    expect(ids).not.toContain(badTab.id)
  })

  it('listHistory merges latest global for employee', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-shifthist-merge-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const repo = new ShiftRepository(db)
    const service = new ShiftService(repo)

    const other = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('O','O','employee',1)`).run()
        .lastInsertRowid,
    )
    const self = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('S','S','employee',1)`).run()
        .lastInsertRowid,
    )

    const sOther = repo.createSession(1, '2026-03-21', 0, other)
    db.prepare(
      `UPDATE cash_sessions SET status = 'closed', closed_at = '2026-03-21T12:00:00', pending_reconcile_total = 0 WHERE id = ?`,
    ).run(sOther.id)

    const sSelf = repo.createSession(1, '2026-03-21', 0, self)
    db.prepare(
      `UPDATE cash_sessions SET status = 'closed', closed_at = '2026-03-21T11:00:00', pending_reconcile_total = 0 WHERE id = ?`,
    ).run(sSelf.id)

    const hist = service.listHistory(mockUser(self, 'employee'))
    const sessionIds = hist.map((h) => h.id)
    expect(sessionIds).toContain(sOther.id)
    expect(sessionIds).toContain(sSelf.id)
    expect(new Set(sessionIds).size).toBe(sessionIds.length)
  })

  it('manager listHistory returns closed sessions', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-shifthist-mgr-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const repo = new ShiftRepository(db)
    const service = new ShiftService(repo)
    const mgr = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('M','M','manager',1)`).run()
        .lastInsertRowid,
    )
    const s = repo.createSession(1, '2026-03-22', 10, mgr)
    db.prepare(
      `UPDATE cash_sessions SET status = 'closed', closed_at = '2026-03-22T08:00:00', expected_cash = 10, counted_cash = 10, pending_reconcile_total = 0 WHERE id = ?`,
    ).run(s.id)

    const hist = service.listHistory(mockUser(mgr, 'manager'))
    expect(hist.some((h) => h.id === s.id)).toBe(true)
    expect(hasAtLeastRole('manager', 'manager')).toBe(true)
  })
})
