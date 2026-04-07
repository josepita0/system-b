import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/main/database/connection'
import { runMigrations } from '../../src/main/database/migrate'
import { DashboardService } from '../../src/main/services/dashboardService'

const cleanupQueue: Array<{ filePath: string; close?: () => void }> = []

afterEach(() => {
  for (const item of cleanupQueue.splice(0)) {
    item.close?.()
    fs.rmSync(path.dirname(item.filePath), { recursive: true, force: true })
  }
})

describe('DashboardService', () => {
  it('aggregates sales by business_date and builds top lists', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-dashboard-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const employee1 = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('Ana','Perez','employee',1)`).run()
        .lastInsertRowid,
    )
    const employee2 = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('Beto','Diaz','employee',1)`).run()
        .lastInsertRowid,
    )

    const productA = Number(
      db.prepare(
        `INSERT INTO products (sku, name, type, sale_price, min_stock, is_active, category_id)
         VALUES ('A','Cerveza','simple',5,0,1,(SELECT id FROM categories WHERE slug = 'general'))`,
      ).run()
        .lastInsertRowid,
    )
    const productB = Number(
      db.prepare(
        `INSERT INTO products (sku, name, type, sale_price, min_stock, is_active, category_id)
         VALUES ('B','Ron','simple',10,0,1,(SELECT id FROM categories WHERE slug = 'general'))`,
      ).run()
        .lastInsertRowid,
    )

    const session1 = Number(
      db.prepare(
        `INSERT INTO cash_sessions (shift_id, business_date, opened_at, opening_cash, status)
         VALUES (1, '2026-03-18', '2026-03-18T10:00:00', 0, 'closed')`,
      ).run().lastInsertRowid,
    )
    const session2 = Number(
      db.prepare(
        `INSERT INTO cash_sessions (shift_id, business_date, opened_at, opening_cash, status)
         VALUES (1, '2026-03-19', '2026-03-19T10:00:00', 0, 'closed')`,
      ).run().lastInsertRowid,
    )

    const tabId = Number(
      db.prepare(
        `INSERT INTO customer_tabs (customer_name, status, opened_at, opened_cash_session_id, opened_by_employee_id)
         VALUES ('Cliente', 'open', '2026-03-18T12:00:00', ?, ?)`,
      ).run(session1, employee1).lastInsertRowid,
    )

    const salePos = Number(
      db.prepare(
        `INSERT INTO sales (cash_session_id, employee_id, sale_type, total, created_at)
         VALUES (?, ?, 'pos', 100, '2026-03-18T11:00:00')`,
      ).run(session1, employee1).lastInsertRowid,
    )
    db.prepare(
      `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, discount, quantity, subtotal)
       VALUES (?, ?, 'Cerveza', 5, 0, 10, 50),
              (?, ?, 'Ron', 10, 0, 5, 50)`,
    ).run(salePos, productA, salePos, productB)

    const saleTabCharge = Number(
      db.prepare(
        `INSERT INTO sales (cash_session_id, employee_id, sale_type, total, created_at, tab_id)
         VALUES (?, ?, 'tab_charge', 40, '2026-03-18T12:00:00', ?)`,
      ).run(session1, employee1, tabId).lastInsertRowid,
    )
    db.prepare(
      `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, discount, quantity, subtotal)
       VALUES (?, ?, 'Ron', 10, 0, 4, 40)`,
    ).run(saleTabCharge, productB)

    const saleTabPayment = Number(
      db.prepare(
        `INSERT INTO sales (cash_session_id, employee_id, sale_type, total, created_at, tab_id)
         VALUES (?, ?, 'tab_payment', 60, '2026-03-19T12:00:00', ?)`,
      ).run(session2, employee2, tabId).lastInsertRowid,
    )
    db.prepare(
      `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, discount, quantity, subtotal)
       VALUES (?, ?, 'Cerveza', 5, 0, 12, 60)`,
    ).run(saleTabPayment, productA)

    const service = new DashboardService(db)
    const overview = service.getOverview({ from: '2026-03-18', to: '2026-03-19' })

    expect(overview.kpis.sales.paidTotal).toBe(160)
    expect(overview.kpis.sales.paidTransactions).toBe(2)
    expect(overview.kpis.sales.tabChargeTotal).toBe(40)
    expect(overview.kpis.sales.tabChargeTransactions).toBe(1)

    const d18 = overview.dailySales.find((d) => d.businessDate === '2026-03-18')
    const d19 = overview.dailySales.find((d) => d.businessDate === '2026-03-19')
    expect(d18?.paidTotal).toBe(100)
    expect(d18?.tabChargeTotal).toBe(40)
    expect(d19?.paidTotal).toBe(60)
    expect(d19?.tabChargeTotal).toBe(0)

    expect(overview.topEmployees[0]?.employeeId).toBe(employee1)
    expect(overview.topEmployees[0]?.paidTotal).toBe(100)
    expect(overview.topEmployees[1]?.employeeId).toBe(employee2)
    expect(overview.topEmployees[1]?.paidTotal).toBe(60)

    expect(overview.topProducts[0]?.productId).toBe(productA)
    expect(overview.topProducts[0]?.quantitySold).toBe(22)
    expect(overview.topProducts[1]?.productId).toBe(productB)
    expect(overview.topProducts[1]?.quantitySold).toBe(9)
  })

  it('supports filtering products and sales totals by employee', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'barra-dashboard-emp-'))
    const dbPath = path.join(directory, 'test.sqlite')
    const db = createDatabase(dbPath)
    cleanupQueue.push({ filePath: dbPath, close: () => db.close() })
    runMigrations(db, path.join(process.cwd(), 'src', 'main', 'database', 'migrations'))

    const e1 = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('Ana','Perez','employee',1)`).run()
        .lastInsertRowid,
    )
    const e2 = Number(
      db.prepare(`INSERT INTO employees (first_name, last_name, role, is_active) VALUES ('Beto','Diaz','employee',1)`).run()
        .lastInsertRowid,
    )

    const p1 = Number(
      db.prepare(
        `INSERT INTO products (sku, name, type, sale_price, min_stock, is_active, category_id)
         VALUES ('A','Cerveza','simple',5,0,1,(SELECT id FROM categories WHERE slug = 'general'))`,
      ).run()
        .lastInsertRowid,
    )
    const p2 = Number(
      db.prepare(
        `INSERT INTO products (sku, name, type, sale_price, min_stock, is_active, category_id)
         VALUES ('B','Ron','simple',10,0,1,(SELECT id FROM categories WHERE slug = 'general'))`,
      ).run()
        .lastInsertRowid,
    )

    const session = Number(
      db.prepare(
        `INSERT INTO cash_sessions (shift_id, business_date, opened_at, opening_cash, status)
         VALUES (1, '2026-03-18', '2026-03-18T10:00:00', 0, 'closed')`,
      ).run().lastInsertRowid,
    )

    const sale1 = Number(
      db.prepare(`INSERT INTO sales (cash_session_id, employee_id, sale_type, total) VALUES (?, ?, 'pos', 50)`).run(session, e1)
        .lastInsertRowid,
    )
    db.prepare(
      `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, discount, quantity, subtotal)
       VALUES (?, ?, 'Cerveza', 5, 0, 10, 50)`,
    ).run(sale1, p1)

    const sale2 = Number(
      db.prepare(`INSERT INTO sales (cash_session_id, employee_id, sale_type, total) VALUES (?, ?, 'pos', 30)`).run(session, e2)
        .lastInsertRowid,
    )
    db.prepare(
      `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, discount, quantity, subtotal)
       VALUES (?, ?, 'Ron', 10, 0, 3, 30)`,
    ).run(sale2, p2)

    const service = new DashboardService(db)
    const overview = service.getOverview({ from: '2026-03-18', to: '2026-03-18', employeeId: e1 })
    expect(overview.kpis.sales.paidTotal).toBe(50)
    expect(overview.topProducts.length).toBe(1)
    expect(overview.topProducts[0]?.productId).toBe(p1)
  })
})

