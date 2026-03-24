import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type Database from 'better-sqlite3'
import type { ShiftCloseReport } from '../../shared/types/report'
import { ReportGenerationError } from '../errors'
import { getDatabasePath } from '../database/connection'
import { InventoryRepository } from '../repositories/inventoryRepository'
import { ShiftRepository } from '../repositories/shiftRepository'

export async function generateShiftCloseReport(db: Database.Database, sessionId: number) {
  const inventoryRepository = new InventoryRepository(db)
  const shiftRepository = new ShiftRepository(db)
  const session = shiftRepository.getSessionById(sessionId)
  if (!session) {
    throw new ReportGenerationError('No se encontro la sesion a reportar.')
  }

  const shift = shiftRepository.listDefinitions().find((item: { id: number }) => item.id === session.shiftId)
  if (!shift) {
    throw new ReportGenerationError('No se encontro la definicion del turno.')
  }

  const inventory = inventoryRepository.getInventoryBalance()
  const replenishment = inventoryRepository.getReplenishmentList()
  const daySalesTotal = getDaySalesTotal(db, session.businessDate)
  const productsSold = getProductsSold(db, session.businessDate)
  const pdfPath = await createPdf({
    sessionId,
    businessDate: session.businessDate,
    shiftName: shift.name,
    inventory: inventory.map((item: any) => ({
      ingredientId: item.ingredient_id,
      ingredientName: item.ingredient_name,
      stock: item.stock,
      minStock: item.min_stock,
    })),
    replenishment: replenishment.map((item: any) => ({
      productId: item.ingredient_id,
      productName: item.ingredient_name,
      sku: item.ingredient_name,
      currentStock: item.stock,
      minStock: item.min_stock,
    })),
    shiftCash: session.countedCash ?? session.expectedCash ?? session.openingCash,
    daySalesTotal,
    productsSold,
    pdfPath: '',
  })

  return {
    sessionId,
    businessDate: session.businessDate,
    shiftName: shift.name,
    inventory: inventory.map((item: any) => ({
      ingredientId: item.ingredient_id,
      ingredientName: item.ingredient_name,
      stock: item.stock,
      minStock: item.min_stock,
    })),
    replenishment: replenishment.map((item: any) => ({
      productId: item.ingredient_id,
      productName: item.ingredient_name,
      sku: item.ingredient_name,
      currentStock: item.stock,
      minStock: item.min_stock,
    })),
    shiftCash: session.countedCash ?? session.expectedCash ?? session.openingCash,
    daySalesTotal,
    productsSold,
    pdfPath,
  } satisfies ShiftCloseReport
}

function getDaySalesTotal(db: Database.Database, businessDate: string) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(sales.total), 0) AS total
       FROM sales
       INNER JOIN cash_sessions ON cash_sessions.id = sales.cash_session_id
       WHERE cash_sessions.business_date = ?`,
    )
    .get(businessDate) as { total: number }
  return row.total
}

function getProductsSold(db: Database.Database, businessDate: string) {
  return db
    .prepare(
      `SELECT sale_items.product_id AS productId,
              sale_items.product_name AS productName,
              SUM(sale_items.quantity) AS quantity,
              SUM(sale_items.subtotal) AS total
       FROM sale_items
       INNER JOIN sales ON sales.id = sale_items.sale_id
       INNER JOIN cash_sessions ON cash_sessions.id = sales.cash_session_id
       WHERE cash_sessions.business_date = ?
       GROUP BY sale_items.product_id, sale_items.product_name
       ORDER BY total DESC`,
    )
    .all(businessDate) as Array<{ productId: number; productName: string; quantity: number; total: number }>
}

async function createPdf(report: ShiftCloseReport) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  let cursorY = 800

  const writeLine = (text: string, size = 11) => {
    page.drawText(text, { x: 40, y: cursorY, size, font, color: rgb(0.1, 0.1, 0.1) })
    cursorY -= size + 6
  }

  writeLine('Reporte de Cierre de Turno', 18)
  writeLine(`Fecha operativa: ${report.businessDate}`)
  writeLine(`Turno: ${report.shiftName}`)
  writeLine(`Caja turno: ${report.shiftCash.toFixed(2)}`)
  writeLine(`Ventas acumuladas del dia: ${report.daySalesTotal.toFixed(2)}`)
  cursorY -= 8
  writeLine('Productos vendidos:', 13)
  report.productsSold.slice(0, 12).forEach((item) => writeLine(`- ${item.productName}: ${item.quantity} / ${item.total.toFixed(2)}`))
  cursorY -= 8
  writeLine('Reponer:', 13)
  report.replenishment.slice(0, 12).forEach((item) => writeLine(`- ${item.productName}: stock ${item.currentStock}, minimo ${item.minStock}`))

  const reportsDir = path.join(path.dirname(getDatabasePath()), 'reports')
  fs.mkdirSync(reportsDir, { recursive: true })
  const pdfPath = path.join(reportsDir, `shift-close-${report.sessionId}.pdf`)
  fs.writeFileSync(pdfPath, await pdf.save())
  return pdfPath
}
