import fs from 'node:fs'
import path from 'node:path'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RowInput } from 'jspdf-autotable'
import type Database from 'better-sqlite3'
import type {
  AccountOpenedConsumptionLine,
  AccountOpenedInShift,
  CancelledEmptyAccountInShift,
  PosSaleLineDetail,
  ReplenishmentItem,
  ShiftCloseReport,
  TabChargeSessionAccount,
} from '../../shared/types/report'
import { ReportGenerationError } from '../errors'
import { getDatabasePath } from '../database/connection'
import { InternalConsumptionRepository } from '../repositories/internalConsumptionRepository'
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
  const posSaleLines = getPosSaleLinesForSession(db, sessionId)
  const tabChargeAccountsInSession = getTabChargeAccountsInSession(db, sessionId)
  const accountsPendingLiquidation = shiftRepository.getOpenPendingAccountsToLiquidate()
  const cancelledEmptyAccounts = shiftRepository.getCancelledEmptyAccountsInSession(sessionId)
  const internalConsumptions = new InternalConsumptionRepository(db).listActiveWithLinesForSession(sessionId)
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
    posSaleLines,
    tabChargeAccountsInSession,
    accountsPendingLiquidation,
    cancelledEmptyAccounts,
    internalConsumptions,
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
    posSaleLines,
    tabChargeAccountsInSession,
    accountsPendingLiquidation,
    cancelledEmptyAccounts,
    internalConsumptions,
    pdfPath,
  } satisfies ShiftCloseReport
}

function formatClosureAtLabel(closedAt: string | null) {
  if (!closedAt) {
    return null
  }
  try {
    return new Date(closedAt).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return null
  }
}

function formatOpenedAtLabel(openedAt: string) {
  try {
    return new Date(openedAt).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return openedAt
  }
}

function formatAccountConsumptionCell(
  lines: AccountOpenedConsumptionLine[],
  fmtEuro: (n: number) => string,
) {
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

function getPosSaleLinesForSession(db: Database.Database, sessionId: number): PosSaleLineDetail[] {
  const rows = db
    .prepare(
      `SELECT si.product_name AS productName,
              si.quantity AS quantity,
              si.subtotal AS subtotal,
              si.price_change_note AS priceChangeNote,
              TRIM(COALESCE(v.name, '')) AS vipName,
              json_extract(s.vip_condition_snapshot, '$.conditionType') AS vipSaleCondition
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       LEFT JOIN vip_customers v ON v.id = s.vip_customer_id
       WHERE s.cash_session_id = ?
         AND s.sale_type = 'pos'
       ORDER BY s.id ASC, si.id ASC`,
    )
    .all(sessionId) as Array<{
    productName: string
    quantity: number
    subtotal: number
    priceChangeNote: string | null
    vipName: string
    vipSaleCondition: string | null
  }>

  return rows.map((r) => {
    const exempt = r.vipSaleCondition === 'exempt'
    const lineTotal = exempt ? 0 : Math.round(Number(r.subtotal) * 100) / 100
    const vipCustomerLabel =
      r.vipName && r.vipName.length > 0
        ? r.vipName.length > 36
          ? `${r.vipName.slice(0, 33)}...`
          : r.vipName
        : 'N/A'
    const rawNote = r.priceChangeNote?.trim() ?? ''
    const priceChangeNote =
      rawNote.length > 0 ? (rawNote.length > 120 ? `${rawNote.slice(0, 117)}...` : rawNote) : null
    return {
      productName: r.productName,
      quantity: Number(r.quantity),
      vipCustomerLabel,
      priceChangeNote,
      lineTotal,
    }
  })
}

function getTabChargeAccountsInSession(db: Database.Database, sessionId: number): TabChargeSessionAccount[] {
  const tabIdRows = db
    .prepare(
      `SELECT DISTINCT s.tab_id AS tabId
       FROM sales s
       WHERE s.cash_session_id = ?
         AND s.sale_type = 'tab_charge'
         AND s.tab_id IS NOT NULL`,
    )
    .all(sessionId) as Array<{ tabId: number }>

  if (tabIdRows.length === 0) {
    return []
  }

  const metaStmt = db.prepare(
    `SELECT ct.id AS tabId,
            ct.customer_name AS customerName,
            ct.opened_at AS openedAt,
            v.condition_type AS vipConditionType
     FROM customer_tabs ct
     LEFT JOIN vip_customers v ON v.id = ct.vip_customer_id
     WHERE ct.id = ?`,
  )

  const linesStmt = db.prepare(
    `SELECT si.product_name AS productName, si.quantity AS quantity, si.subtotal AS subtotal
     FROM sale_items si
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE s.tab_id = ? AND s.sale_type = 'tab_charge'
     ORDER BY s.id ASC, si.id ASC`,
  )

  const balanceStmt = db.prepare(
    `SELECT COALESCE(SUM(si.subtotal), 0) AS t
     FROM sale_items si
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE s.tab_id = ? AND s.sale_type = 'tab_charge'`,
  )

  const withMeta = tabIdRows
    .map(({ tabId }) => {
      const meta = metaStmt.get(tabId) as
        | {
            tabId: number
            customerName: string
            openedAt: string
            vipConditionType: string | null
          }
        | undefined
      if (!meta) {
        return null
      }
      return { tabId, meta }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => new Date(a.meta.openedAt).getTime() - new Date(b.meta.openedAt).getTime())

  return withMeta.map(({ tabId, meta }) => {
    const rawLines = linesStmt.all(tabId) as Array<{
      productName: string
      quantity: number
      subtotal: number
    }>
    const balRow = balanceStmt.get(tabId) as { t: number }
    const balanceTotal = Math.round(Number(balRow.t) * 100) / 100
    const isVipExempt = meta.vipConditionType === 'exempt'
    return {
      tabId,
      customerName: meta.customerName,
      openedAt: meta.openedAt,
      consumptionLines: rawLines.map((li) => ({
        productName: li.productName,
        quantity: Number(li.quantity),
        subtotal: Number(li.subtotal),
      })),
      balanceTotal,
      isVipExempt,
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
  /** Fondo del resumen de ventas (contado + cuenta + general). */
  summaryBand: [214, 236, 220] as [number, number, number],
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

  if (report.internalConsumptions.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 32, 38)
    doc.text('Consumos internos del turno', margin, startY)
    startY += 14

    const formatInternalConsumptionNote = (reason: string, lineNote: string | null) => {
      const parts: string[] = []
      const r = reason.trim()
      if (r) {
        parts.push(r.length > 80 ? `${r.slice(0, 77)}...` : r)
      }
      const n = lineNote?.trim()
      if (n) {
        parts.push(n.length > 80 ? `${n.slice(0, 77)}...` : n)
      }
      return parts.length > 0 ? parts.join(' · ') : '—'
    }

    const icBody: string[][] = []
    for (const ic of report.internalConsumptions) {
      if (ic.lines.length > 0) {
        for (const l of ic.lines) {
          icBody.push([
            l.productName.length > 36 ? `${l.productName.slice(0, 33)}...` : l.productName,
            formatQuantityEs(l.quantity),
            formatInternalConsumptionNote(ic.reason, l.note),
          ])
        }
      } else {
        icBody.push(['Sin lineas en el documento.', '—', formatInternalConsumptionNote(ic.reason, null)])
      }
    }

    autoTable(doc, {
      startY,
      head: [['Producto', 'Cantidad', 'Nota']],
      body: icBody,
      theme: 'grid',
      tableWidth: innerW,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
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
        0: { cellWidth: innerW * 0.34, halign: 'left' },
        1: { cellWidth: innerW * 0.14, halign: 'center' },
        2: { cellWidth: innerW * 0.52, halign: 'left' },
      },
    })

    const afterIc = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY
    startY = afterIc + 16
  }

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

  if (report.accountsPendingLiquidation.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 32, 38)
    doc.text('Cuentas pendientes por liquidar', margin, startY)
    startY += 14

    const pendingAccountsBody = report.accountsPendingLiquidation.map((a) => [
      a.customerName,
      formatOpenedAtLabel(a.openedAt),
      formatAccountConsumptionCell(a.consumptionLines, fmt),
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
        if (data.section !== 'body') {
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
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 32, 38)
  doc.text('Ventas al contado', margin, startY)
  startY += 14

  const totalContado = Math.round(report.posSaleLines.reduce((s, p) => s + p.lineTotal, 0) * 100) / 100
  const totalCuentaAbierta =
    Math.round(
      report.tabChargeAccountsInSession.reduce((s, a) => s + (a.isVipExempt ? 0 : a.balanceTotal), 0) * 100,
    ) / 100
  const totalGeneral = Math.round((totalContado + totalCuentaAbierta) * 100) / 100

  const posBodyRows =
    report.posSaleLines.length > 0
      ? report.posSaleLines.map((p) => [
          p.productName.length > 36 ? `${p.productName.slice(0, 33)}...` : p.productName,
          formatQuantityEs(p.quantity),
          p.vipCustomerLabel,
          p.priceChangeNote ?? '—',
          formatEuro(p.lineTotal),
        ])
      : [['Sin ventas al contado en este turno.', '—', '—', '—', '—']]

  autoTable(doc, {
    startY,
    head: [
      [
        { content: 'Producto', styles: { halign: 'left' as const } },
        { content: 'Cantidad', styles: { halign: 'center' as const } },
        { content: 'Cliente VIP', styles: { halign: 'center' as const } },
        { content: 'Cambio de precio', styles: { halign: 'left' as const } },
        { content: 'Total', styles: { halign: 'right' as const } },
      ],
    ],
    body: posBodyRows,
    foot:
      report.posSaleLines.length > 0
        ? [
            [
              {
                content: 'Total ventas al contado',
                colSpan: 4,
                styles: {
                  fillColor: C.barGreen,
                  textColor: 255,
                  fontStyle: 'bold',
                  halign: 'left',
                  cellPadding: { top: 10, right: 8, bottom: 10, left: 10 },
                },
              },
              {
                content: formatEuro(totalContado),
                styles: {
                  fillColor: C.barGreen,
                  textColor: 255,
                  fontStyle: 'bold',
                  halign: 'right',
                  cellPadding: { top: 10, right: 10, bottom: 10, left: 8 },
                },
              },
            ],
          ]
        : undefined,
    theme: 'grid',
    tableWidth: innerW,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
      lineColor: C.border,
      lineWidth: 0.35,
      valign: 'middle',
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
    footStyles: {
      fillColor: C.barGreen,
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: innerW * 0.26, halign: 'left' },
      1: { cellWidth: innerW * 0.12, halign: 'center' },
      2: { cellWidth: innerW * 0.16, halign: 'center' },
      3: { cellWidth: innerW * 0.26, halign: 'left' },
      4: { cellWidth: innerW * 0.2, halign: 'right', fontStyle: 'bold', textColor: C.moneyGreen },
    },
    alternateRowStyles: {
      fillColor: C.zebra,
    },
    didParseCell: (data) => {
      if (data.section === 'body' && report.posSaleLines.length > 0 && data.column.index === 4) {
        data.cell.styles.textColor = C.moneyGreen
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  startY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY) + 24

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 32, 38)
  doc.text('Ventas en cuenta abierta', margin, startY)
  startY += 14

  const tabChargeBody =
    report.tabChargeAccountsInSession.length === 0
      ? [
          [
            {
              content: 'Sin cargos a cuenta registrados en este turno.',
              colSpan: 4,
              styles: { halign: 'center' as const, textColor: C.labelGrey },
            },
          ],
        ]
      : report.tabChargeAccountsInSession.map((a) => [
          a.customerName,
          formatOpenedAtLabel(a.openedAt),
          formatAccountConsumptionCell(a.consumptionLines, fmt),
          formatEuro(a.isVipExempt ? 0 : a.balanceTotal),
        ])

  autoTable(doc, {
    startY,
    head: [['Cliente', 'Apertura', 'Consumos (cargos a cuenta)', 'Total cuenta']],
    body: tabChargeBody,
    foot:
      report.tabChargeAccountsInSession.length > 0
        ? [
            [
              {
                content: 'Total ventas en cuenta abierta',
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
                content: formatEuro(totalCuentaAbierta),
                styles: {
                  fillColor: C.barGreen,
                  textColor: 255,
                  fontStyle: 'bold',
                  halign: 'right',
                  cellPadding: { top: 10, right: 10, bottom: 10, left: 8 },
                },
              },
            ],
          ]
        : undefined,
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
    footStyles: {
      fillColor: C.barGreen,
      textColor: 255,
      fontStyle: 'bold',
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
      if (data.section !== 'body' || report.tabChargeAccountsInSession.length === 0) {
        return
      }
      if (data.column.index === 3) {
        data.cell.styles.textColor = C.moneyGreen
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  startY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY) + 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...C.navy)
  doc.text('Resumen de ventas del turno', margin, startY)
  startY += 14

  autoTable(doc, {
    startY,
    head: [
      [
        { content: 'Total (Contado)', styles: { halign: 'center' as const } },
        { content: 'Total (Cuenta abierta)', styles: { halign: 'center' as const } },
        { content: 'Total general', styles: { halign: 'center' as const } },
      ],
    ],
    body: [[formatEuro(totalContado), formatEuro(totalCuentaAbierta), formatEuro(totalGeneral)]],
    theme: 'grid',
    tableWidth: innerW,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 11,
      cellPadding: { top: 12, right: 10, bottom: 12, left: 10 },
      lineColor: C.border,
      lineWidth: 0.45,
      valign: 'middle',
    },
    headStyles: {
      fillColor: C.navy,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: { top: 11, right: 8, bottom: 11, left: 8 },
    },
    bodyStyles: {
      fillColor: C.summaryBand,
      textColor: [30, 32, 38],
      fontStyle: 'bold',
      fontSize: 12,
    },
    columnStyles: {
      0: { cellWidth: innerW / 3, halign: 'center' as const },
      1: { cellWidth: innerW / 3, halign: 'center' as const },
      2: { cellWidth: innerW / 3, halign: 'center' as const },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.row.index !== 0) {
        return
      }
      data.cell.styles.fillColor = C.summaryBand
      if (data.column.index === 2) {
        data.cell.styles.fontSize = 14
        data.cell.styles.textColor = C.moneyGreen
      } else {
        data.cell.styles.textColor = [40, 44, 52]
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
