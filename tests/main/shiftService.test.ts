import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { ShiftRepository } from '../../src/main/repositories/shiftRepository'
import { resolveShiftForDate, ShiftService } from '../../src/main/services/shiftService'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    const filePath = item.filePath
    fs.rmSync(path.dirname(filePath), { recursive: true, force: true })
  }
})

describe('ShiftService', () => {
  it('resolves fixed business shifts', () => {
    expect(resolveShiftForDate(new Date('2026-03-18T10:00:00'))).toBe('day')
    expect(resolveShiftForDate(new Date('2026-03-18T18:59:00'))).toBe('day')
    expect(resolveShiftForDate(new Date('2026-03-18T19:00:00'))).toBe('night')
    expect(resolveShiftForDate(new Date('2026-03-19T02:30:00'))).toBe('night')
  })

  it('opens and closes a cash session', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-shifts-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })

    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))
    const openerId = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('A','B','employee',1)`).run()
        .lastInsertRowid,
    )
    const service = new ShiftService(new ShiftRepository(db))
    const opened = service.open(
      {
        shiftCode: 'day',
        businessDate: '2026-03-18',
        openingCash: 100,
      },
      openerId,
    )

    expect(opened.status).toBe('open')

    const closed = service.close({
      sessionId: opened.id,
      countedCash: 100,
    })

    expect(closed.status).toBe('closed')
    expect(closed.differenceCash).toBe(0)
  })
})
