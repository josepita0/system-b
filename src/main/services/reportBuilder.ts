import fs from 'node:fs'
import path from 'node:path'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RowInput } from 'jspdf-autotable'
import type Database from 'better-sqlite3'
import type {
  AccountOpenedInShift,
  CancelledEmptyAccountInShift,
  ReplenishmentItem,
  ShiftCloseReport,
} from '../../shared/types/report'
import { ReportGenerationError } from '../errors'
import { getDatabasePath } from '../database/connection'
import { InventoryRepository } from '../repositories/inventoryRepository'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { ShiftRepository } from '../repositories/shiftRepository'

export async function generateShiftCloseReport(db: Database.Database, sessionId: number) {
  const inventoryRepository = new InventoryRepository(db)
  const productInventoryRepository = new ProductInventoryRepository(db)
  const shiftRepository = new ShiftRepository(db)
  const session = shiftRepository.getSessionById(sessionId)
  if (!session) {
    throw new ReportGenerationError('No se encontro la sesion a reportar.')
  }

  const shift = shiftRepository.listDefinitions().find((item: { id: number }) => item.id === session.shiftId)
  if (!shift) {
    throw new ReportGenerationError('No se encontro la definicion del turno.')
  }

  /** Cierre de turno siempre en EUR (€) según política del producto. */
  const currencyCode = 'EUR'

  const inventory = inventoryRepository.getInventoryBalance()
  const replenishment = productInventoryRepository.getReplenishmentList()
  const daySalesTotal = shiftRepository.getSalesTotalForSession(sessionId)
  const productsSold = getProductsSoldForSession(db, sessionId)
  const accountsPendingLiquidation = shiftRepository.getOpenPendingAccountsToLiquidate()
  const cancelledEmptyAccounts = shiftRepository.getCancelledEmptyAccountsInSession(sessionId)
  /** Misma base que el cierre de turno y la suma de «Total cuenta» (todas las cuentas abiertas). */
  const shiftPendingReconcile = Math.round(shiftRepository.getTotalPendingReconcileOpenTabs() * 100) / 100
  const closedByLabel = getClosedByLabel(db, session.openedByUserId)
  const openingCash = session.openingCash ?? 0

  const closureAtLabel = formatClosureAtLabel(session.closedAt)

  const pdfPath = createPdf({
    sessionId,
    businessDate: session.businessDate,
    shiftName: shift.name,
    closingNote: session.closingNote ?? null,
    inventory: inventory.map((item: any) => ({
      ingredientId: item.ingredient_id,
      ingredientName: item.ingredient_name,
      stock: item.stock,
      minStock: item.min_stock,
    })),
    replenishment: replenishment.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku,
      currentStock: item.stock,
      minStock: item.min_stock,
    })),
    shiftCash: session.countedCash ?? session.expectedCash ?? session.openingCash,
    openingCash,
    daySalesTotal,
    shiftPendingReconcile,
    closedByLabel,
    currencyCode,
    closureAtLabel,
    productsSold,
    accountsPendingLiquidation,
    cancelledEmptyAccounts,
    pdfPath: '',
  })

  return {
    sessionId,
    businessDate: session.businessDate,
    shiftName: shift.name,
    closingNote: session.closingNote ?? null,
    inventory: inventory.map((item: any) => ({
      ingredientId: item.ingredient_id,
      ingredientName: item.ingredient_name,
      stock: item.stock,
      minStock: item.min_stock,
    })),
    replenishment: replenishment.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku,
      currentStock: item.stock,
      minStock: item.min_stock,
    })),
    shiftCash: session.countedCash ?? session.expectedCash ?? session.openingCash,
    openingCash,
    daySalesTotal,
    shiftPendingReconcile,
    closedByLabel,
    currencyCode,
    closureAtLabel,
    productsSold,
    accountsPendingLiquidation,
    cancelledEmptyAccounts,
    pdfPath,
  } satisfies ShiftCloseReport
}

function formatClosureAtLabel(closedAt: string | null) {
  if (!closedAt) {
    return null
  }
  try {
    return new Date(closedAt).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return null
  }
}

function formatOpenedAtLabel(openedAt: string) {
  try {
    return new Date(openedAt).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return openedAt
  }
}

function formatAccountConsumptionCell(account: AccountOpenedInShift, fmtEuro: (n: number) => string) {
  const lines = account.consumptionLines
  if (lines.length === 0) {
    return 'Sin cargos registrados en la cuenta.'
  }
  return lines
    .map((l) => {
      const name = l.productName.length > 52 ? `${l.productName.slice(0, 49)}...` : l.productName
      return `${name} · ${formatQuantityEs(l.quantity)} · ${fmtEuro(l.subtotal)}`
    })
    .join('\n')
}

function getClosedByLabel(db: Database.Database, openedByUserId: number | null) {
  if (openedByUserId == null) {
    return 'Sin registro'
  }
  const row = db
    .prepare('SELECT first_name AS firstName, last_name AS lastName, role FROM employees WHERE id = ?')
    .get(openedByUserId) as { firstName: string; lastName: string; role: string } | undefined
  if (!row) {
    return 'Sin registro'
  }
  const name = `${row.firstName} ${row.lastName}`.trim()
  if (name) {
    return name
  }
  return roleToSpanishLabel(row.role)
}

function roleToSpanishLabel(role: string) {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'manager':
      return 'Gerente'
    case 'staff':
    case 'employee':
      return 'Personal'
    default:
      return role || 'Usuario'
  }
}

function getProductsSoldForSession(db: Database.Database, sessionId: number) {
  const rows = db
    .prepare(
      `SELECT sale_items.product_id AS productId,
              sale_items.product_name AS productName,
              SUM(sale_items.quantity) AS quantity,
              SUM(sale_items.subtotal) AS total,
              GROUP_CONCAT(DISTINCT TRIM(COALESCE(vip_customers.name, ''))) AS vipNames
       FROM sale_items
       INNER JOIN sales ON sales.id = sale_items.sale_id
       LEFT JOIN vip_customers ON vip_customers.id = sales.vip_customer_id
       WHERE sales.cash_session_id = ?
       GROUP BY sale_items.product_id, sale_items.product_name
       ORDER BY total DESC`,
    )
    .all(sessionId) as Array<{
    productId: number
    productName: string
    quantity: number
    total: number
    vipNames: string | null
  }>

  return rows.map((r) => {
    const raw = r.vipNames?.replace(/^,+|,+$/g, '').trim() ?? ''
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    let vipCustomerLabel = 'N/A'
    if (parts.length === 1) {
      vipCustomerLabel = parts[0].length > 36 ? `${parts[0].slice(0, 33)}...` : parts[0]
    } else if (parts.length > 1) {
      vipCustomerLabel = 'Varios'
    }
    return {
      productId: r.productId,
      productName: r.productName,
      quantity: r.quantity,
      total: r.total,
      vipCustomerLabel,
    }
  })
}

function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currencyCode }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`
  }
}

function formatEuro(amount: number) {
  return formatMoney(amount, 'EUR')
}

function formatQuantityEs(q: number) {
  const n = Math.round(q * 1000) / 1000
  if (Number.isInteger(n)) {
    return `${n} uds.`
  }
  return `${n} uds.`
}

/** Cantidad a reponer para alcanzar el mínimo: max(0, mínimo − actual). */
function restockUnitsNeeded(item: ReplenishmentItem): number {
  return Math.max(0, item.minStock - item.currentStock)
}

function formatStockReportCell(n: number): string {
  return String(Math.round(n * 1000) / 1000)
}

function formatRestockQtyLabel(qty: number): string {
  const n = Math.round(qty * 1000) / 1000
  if (Number.isInteger(n)) {
    return `${n} unidades`
  }
  return `${n} unidades`
}

/** Menor brecha → naranja; mayor → rojo (misma idea que el mockup). */
function restockQtyTextColor(qty: number): [number, number, number] {
  if (qty <= 10) {
    return [230, 126, 34]
  }
  return [200, 50, 55]
}

/** Paleta alineada al diseño (navy, gris cabecera tabla, verde #27ae60). */
const C = {
  navy: [26, 32, 44] as [number, number, number],
  cierraBlue: [140, 200, 255] as [number, number, number],
  tableHead: [74, 85, 104] as [number, number, number],
  barGreen: [39, 174, 96] as [number, number, number],
  moneyGreen: [20, 130, 60] as [number, number, number],
  cardBlue: [224, 242, 252] as [number, number, number],
  cardGreen: [230, 247, 233] as [number, number, number],
  cardGrey: [240, 240, 242] as [number, number, number],
  labelGrey: [100, 100, 110] as [number, number, number],
  border: [200, 204, 210] as [number, number, number],
  zebra: [250, 251, 252] as [number, number, number],
}

function createPdf(report: ShiftCloseReport): string {
  const margin = 40
  const pageW = 595
  const pageH = 842
  const innerW = pageW - 2 * margin

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  doc.setLineWidth(0.35)

  const closure = report.closureAtLabel
  const headerH = closure ? 118 : 100
  doc.setFillColor(...C.navy)
  doc.rect(margin, margin, innerW, headerH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(255, 255, 255)
  doc.text('Reporte de Cierre de Turno', margin + 14, margin + 30)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const dateStr = report.businessDate
  const dateW = doc.getTextWidth(dateStr)
  doc.text(dateStr, pageW - margin - 14 - dateW, margin + 26)

  let rightStackY = margin + 44
  if (closure) {
    doc.setFontSize(9)
    const closureLine = `Cierre: ${closure}`
    const clW = doc.getTextWidth(closureLine)
    doc.text(closureLine, pageW - margin - 14 - clW, rightStackY)
    rightStackY += 16
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  const shiftW = doc.getTextWidth(report.shiftName)
  doc.text(report.shiftName, pageW - margin - 14 - shiftW, rightStackY)

  const cierra = `Cierra: ${report.closedByLabel}`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...C.cierraBlue)
  const cw = doc.getTextWidth(cierra)
  doc.text(cierra, pageW - margin - 14 - cw, rightStackY + 18)

  let startY = margin + headerH + 16

  const closingNote = report.closingNote?.trim() ? report.closingNote.trim() : null
  if (closingNote) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 32, 38)
    doc.text('Nota de cierre', margin, startY)
    startY += 12

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 64, 72)
    const maxW = innerW
    const lines = doc.splitTextToSize(closingNote, maxW)
    doc.text(lines, margin, startY)
    startY += Math.min(60, lines.length * 11 + 8)
  }

  const fmt = formatEuro
  const cardFills = [C.cardBlue, C.cardGreen, C.cardGrey]

  autoTable(doc, {
    startY,
    head: [['Caja al inicio', 'Ventas', 'Por conciliar']],
    body: [[fmt(report.openingCash), fmt(report.daySalesTotal), fmt(report.shiftPendingReconcile)]],
    theme: 'grid',
    tableWidth: innerW,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: { top: 10, right: 8, bottom: 10, left: 8 },
      lineColor: C.border,
      lineWidth: 0.4,
      valign: 'middle',
    },
    headStyles: {
      textColor: C.labelGrey,
      fontStyle: 'normal',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 13,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: {},
      1: {},
      2: {},
    },
    didParseCell: (data) => {
      const col = data.column.index
      if (data.section === 'head') {
        data.cell.styles.fillColor = cardFills[col]
        data.cell.styles.halign = 'center'
      }
      if (data.section === 'body' && data.row.index === 0) {
        data.cell.styles.fillColor = cardFills[col]
        if (col === 1) {
          data.cell.styles.textColor = C.moneyGreen
        } else {
          data.cell.styles.textColor = [40, 42, 48]
        }
      }
    },
  })

  const afterCards = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY
  startY = afterCards + 22

  const cancelled = (report.cancelledEmptyAccounts ?? []).filter((a) => a.reason.trim().length > 0)
  if (cancelled.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 32, 38)
    doc.text('Cuentas canceladas (vacías)', margin, startY)
    startY += 14

    autoTable(doc, {
      startY,
      head: [['Cliente', 'Cancelada', 'Usuario', 'Motivo']],
      body: cancelled.map((a) => [
        a.customerName,
        formatOpenedAtLabel(a.cancelledAt),
        a.cancelledByLabel,
        a.reason.length > 160 ? `${a.reason.slice(0, 157)}...` : a.reason,
      ]),
      theme: 'grid',
      tableWidth: innerW,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
        lineColor: C.border,
        lineWidth: 0.35,
        valign: 'top',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: C.tableHead,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: C.zebra,
      },
      columnStyles: {
        0: { cellWidth: innerW * 0.2, halign: 'left' },
        1: { cellWidth: innerW * 0.22, halign: 'left' },
        2: { cellWidth: innerW * 0.18, halign: 'left' },
        3: { cellWidth: innerW * 0.4, halign: 'left' },
      },
    })

    const afterCancelled = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY
    startY = afterCancelled + 22
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 32, 38)
  doc.text('Cuentas pendientes por liquidar', margin, startY)
  startY += 14

  const pendingAccountsBody =
    report.accountsPendingLiquidation.length === 0
      ? [
          [
            {
              content: 'Sin cuentas pendientes por liquidar',
              colSpan: 4,
              styles: { halign: 'center' as const, textColor: C.labelGrey },
            },
          ],
        ]
      : report.accountsPendingLiquidation.map((a) => [
          a.customerName,
          formatOpenedAtLabel(a.openedAt),
          formatAccountConsumptionCell(a, fmt),
          fmt(a.balanceTotal),
        ])

  autoTable(doc, {
    startY,
    head: [['Cliente', 'Apertura', 'Consumos (cargos a cuenta)', 'Total cuenta']],
    body: pendingAccountsBody,
    theme: 'grid',
    tableWidth: innerW,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
      lineColor: C.border,
      lineWidth: 0.35,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      textColor: [40, 42, 48],
    },
    columnStyles: {
      0: { cellWidth: innerW * 0.18, halign: 'left' },
      1: { cellWidth: innerW * 0.2, halign: 'left' },
      2: { cellWidth: innerW * 0.47, halign: 'left' },
      3: { cellWidth: innerW * 0.15, halign: 'right', fontStyle: 'bold', textColor: C.moneyGreen },
    },
    alternateRowStyles: {
      fillColor: C.zebra,
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || report.accountsPendingLiquidation.length === 0) {
        return
      }
      if (data.column.index === 3) {
        data.cell.styles.textColor = C.moneyGreen
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  const afterOpenedTabs = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY
  startY = afterOpenedTabs + 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 32, 38)
  doc.text('Productos vendidos', margin, startY)
  startY += 14

  const totalProducts = report.productsSold.reduce((s, p) => s + p.total, 0)

  const bodyRows =
    report.productsSold.length > 0
      ? report.productsSold.map((p) => [
          p.productName.length > 42 ? `${p.productName.slice(0, 39)}...` : p.productName,
          formatQuantityEs(p.quantity),
          p.vipCustomerLabel,
          formatEuro(p.total),
        ])
      : [['Sin ventas registradas en este turno.', '—', '—', '—']]

  autoTable(doc, {
    startY,
    head: [
      [
        { content: 'Producto', styles: { halign: 'left' as const } },
        { content: 'Cantidad', styles: { halign: 'center' as const } },
        { content: 'Cliente VIP', styles: { halign: 'center' as const } },
        { content: 'Total', styles: { halign: 'right' as const } },
      ],
    ],
    body: bodyRows,
    foot: [
      [
        {
          content: 'Total del turno',
          colSpan: 3,
          styles: {
            fillColor: C.barGreen,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: { top: 10, right: 8, bottom: 10, left: 10 },
          },
        },
        {
          content: formatEuro(totalProducts),
          styles: {
            fillColor: C.barGreen,
            textColor: 255,
            fontStyle: 'bold',
            halign: 'right',
            cellPadding: { top: 10, right: 10, bottom: 10, left: 8 },
          },
        },
      ],
    ],
    theme: 'grid',
    tableWidth: innerW,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      lineColor: C.border,
      lineWidth: 0.35,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [40, 42, 48],
    },
    footStyles: {
      fillColor: C.barGreen,
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: innerW * 0.4, halign: 'left' },
      1: { cellWidth: innerW * 0.18, halign: 'center' },
      2: { cellWidth: innerW * 0.22, halign: 'center' },
      3: { cellWidth: innerW * 0.2, halign: 'right', fontStyle: 'bold', textColor: C.moneyGreen },
    },
    alternateRowStyles: {
      fillColor: C.zebra,
    },
    didParseCell: (data) => {
      if (data.section === 'body' && report.productsSold.length > 0 && data.column.index === 3) {
        data.cell.styles.textColor = C.moneyGreen
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  const afterProducts = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY
  startY = afterProducts + 24

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 32, 38)
  doc.text('Productos a reponer', margin, startY)
  startY += 14

  const restockTotalUnits = report.replenishment.reduce((sum, item) => sum + restockUnitsNeeded(item), 0)

  const restockBody =
    report.replenishment.length === 0
      ? [
          [
            {
              content: 'Sin productos pendientes de reposición',
              colSpan: 4,
              styles: { halign: 'center' as const, textColor: C.labelGrey },
            },
          ],
        ]
      : report.replenishment.map((item) => {
          const qty = restockUnitsNeeded(item)
          const name =
            item.productName.length > 48 ? `${item.productName.slice(0, 45)}...` : item.productName
          return [
            name,
            formatStockReportCell(item.minStock),
            formatStockReportCell(item.currentStock),
            formatRestockQtyLabel(qty),
          ]
        })

  const restockFoot: RowInput[] | undefined =
    report.replenishment.length === 0
      ? undefined
      : [
          [
            {
              content: 'Total a reponer',
              colSpan: 3,
              styles: {
                fillColor: C.barGreen,
                textColor: 255,
                fontStyle: 'bold' as const,
                halign: 'left' as const,
                cellPadding: { top: 10, right: 8, bottom: 10, left: 10 },
              },
            },
            {
              content: formatRestockQtyLabel(restockTotalUnits),
              styles: {
                fillColor: C.barGreen,
                textColor: 255,
                fontStyle: 'bold' as const,
                halign: 'right' as const,
                cellPadding: { top: 10, right: 10, bottom: 10, left: 8 },
              },
            },
          ],
        ]

  autoTable(doc, {
    startY,
    head: [['Producto', 'Stock mínimo', 'Stock actual', 'Cantidad a reponer']],
    body: restockBody,
    foot: restockFoot,
    theme: 'grid',
    tableWidth: innerW,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      textColor: [55, 58, 62],
      cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
      lineColor: C.border,
      lineWidth: 0.35,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fillColor: [252, 252, 253],
    },
    footStyles: {
      fillColor: C.barGreen,
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: innerW * 0.4, halign: 'left' },
      1: { cellWidth: innerW * 0.2, halign: 'center' },
      2: { cellWidth: innerW * 0.2, halign: 'center' },
      3: { cellWidth: innerW * 0.2, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: C.zebra,
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || report.replenishment.length === 0) {
        return
      }
      if (data.column.index !== 3) {
        return
      }
      const rowIdx = data.row.index
      const item = report.replenishment[rowIdx]
      if (!item) {
        return
      }
      const qty = restockUnitsNeeded(item)
      data.cell.styles.textColor = restockQtyTextColor(qty)
    },
  })

  const afterRestock = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY
  const footY = Math.min(afterRestock + 28, pageH - margin - 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(130, 134, 140)
  const foot = 'Generado automáticamente por el sistema'
  doc.text(foot, pageW / 2, footY, { align: 'center' })

  const reportsDir = path.join(path.dirname(getDatabasePath()), 'reports')
  fs.mkdirSync(reportsDir, { recursive: true })
  const pdfPath = path.join(reportsDir, `cierre-de-turno-${report.closedByLabel}.pdf`)
  const out = doc.output('arraybuffer')
  fs.writeFileSync(pdfPath, Buffer.from(out))
  return pdfPath
}
