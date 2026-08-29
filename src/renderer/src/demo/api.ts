import type { AuthApi } from '@shared/ipc/auth'
import type { DashboardApi } from '@shared/ipc/dashboard'
import type { LicenseApi } from '@shared/ipc/license'
import type { ReportApi } from '@shared/ipc/reports'
import type { SalesApi } from '@shared/ipc/sales'
import type { SettingsApi } from '@shared/ipc/settings'
import type { SetupApi } from '@shared/ipc/setup'
import type { ShiftApi } from '@shared/ipc/shifts'
import type { VipCustomersApi } from '@shared/ipc/vipCustomers'
import type { ConsumptionsApi } from '@shared/ipc/consumptions'
import type { BomApi } from '@shared/ipc/bom'
import type { InternalConsumptionsApi } from '@shared/ipc/internalConsumptions'
import type { UserApi } from '@shared/ipc/users'
import type { ProductApi } from '@shared/ipc/products'
import type { DocumentApi } from '@shared/ipc/documents'
import type { InventoryApi } from '@shared/ipc/inventory'
import type { ImageGalleryApi } from '@shared/ipc/imageGallery'
import type { CashSession } from '@shared/types/shift'
import type { DashboardOverview } from '@shared/types/dashboard'
import type { PagedResult } from '@shared/types/pagination'
import type { LicenseFeatureFlags, LicenseStatusInfo } from '@shared/types/license'
import type { VipCustomer, VipCustomerInput } from '@shared/types/vipCustomer'
import type { SaleFormatConsumptionRule } from '@shared/types/consumptionRule'
import { DEMO_CURRENCY, DEMO_MANAGER, DEMO_MIN_OPENING_CASH, compoundBom, consumptionRules, products, shifts, vipCustomers } from './seed'
import { addSale, catalog, createHolder, openShift, sessionDetail, tabDetail, type DemoState } from './db'

const unsupported = (name: string) => { throw new Error(`${name} disponible en la versión completa.`) }
const paged = <T>(items: T[], page = 1, pageSize = 5): PagedResult<T> => ({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize })
const reportFlags: LicenseFeatureFlags = { status: 'missing', dashboardEnabled: true, reportPdfEnabled: true, reportEmailEnabled: false, reason: null, expiresAt: null }
const licenseStatus: LicenseStatusInfo = { id: null, status: 'missing', activationMode: null, planType: null, activatedAt: null, expiresAt: null, issuedTo: null, notes: null, createdByEmployeeId: null, lastUpdatedAt: null, daysRemaining: null, message: 'Modo demo' }

export function createDemoApi(holder = createHolder()) {
  const state = () => holder.get()
  const auth: AuthApi = {
    login: async () => ({ user: DEMO_MANAGER }), logout: async () => ({ success: true }), me: async () => ({ user: DEMO_MANAGER }),
    changePassword: async () => ({ user: DEMO_MANAGER }), recoverPassword: async () => ({ success: true }), requestPasswordResetEmailCode: async () => ({ ok: true }), resetPasswordWithEmailCode: async () => ({ success: true }), verifyPassword: async () => ({ ok: true }),
  }
  const setup: SetupApi = { getStatus: async () => ({ hasAdmin: true, bootstrapPending: false, bootstrapFilePath: null, bootstrapDisplay: null, wizardRequired: false, completedAt: '2026-01-01T08:00:00.000Z', completedByEmployeeId: 1, version: 'demo', mustRunWizard: false }), complete: async () => ({ success: true }) }
  const settings: SettingsApi = { getCashSettings: async () => ({ minOpeningCash: DEMO_MIN_OPENING_CASH }), updateCashSettings: async () => undefined, getSmtpSettings: async () => ({ smtpHost: null, smtpPort: null, smtpUser: null, smtpSecure: false, reportRecipientEmail: null, passwordConfigured: false, passwordFromEnv: false }), updateSmtpSettings: async () => undefined, testSmtp: async () => ({ ok: false, message: 'El correo no está disponible en la demo.' }) }
  const sales: SalesApi = {
    posCatalog: async () => catalog(),
    posProducts: async ({ categoryId, search }) => products.filter((p) => p.categoryId === categoryId && (!search || p.name.toLowerCase().includes(search.toLowerCase()))),
    posInternalConsumptionProducts: async ({ categoryId, search }) => products.filter((p) => p.categoryId === categoryId && (!search || p.name.toLowerCase().includes(search.toLowerCase()))),
    posComplementProducts: async (rootId) => products.filter((p) => p.categoryId === rootId),
    create: async (input) => addSale(state(), input),
    openTab: async (input) => { const id = state().nextId++; const tab = { id, customerName: input.customerName || vipCustomers.find((v) => v.id === input.vipCustomerId)?.name || 'Cuenta demo', openedAt: new Date().toISOString(), balance: 0, vipCustomerId: input.vipCustomerId ?? null, lines: [] }; state().tabs.push(tab); return { id, customerName: tab.customerName, openedAt: tab.openedAt } },
    listOpenTabs: async () => state().tabs.filter((t) => t.balance >= 0), settleTab: async ({ tabId, paymentMethod = 'CASH' }) => { const detail = tabDetail(state(), tabId); const session = state().session!; state().tabs = state().tabs.filter((t) => t.id !== tabId); if (paymentMethod === 'CASH') session.cashSalesTotal = (session.cashSalesTotal ?? 0) + detail.balance; else session.cardSalesTotal = (session.cardSalesTotal ?? 0) + detail.balance; return { saleId: null, total: detail.balance, cashSessionId: session.id, createdAt: new Date().toISOString(), paymentMethod } },
    tabChargeDetail: async (id) => tabDetail(state(), id), removeTabChargeLine: async ({ saleItemId, reason }) => { if (!reason?.trim()) throw new Error('Indique un motivo.'); for (const tab of state().tabs) { const i = tab.lines.findIndex((l) => l.saleItemId === saleItemId); if (i >= 0) { tab.balance -= tab.lines[i]!.subtotal; tab.lines.splice(i, 1); return { tabId: tab.id, newBalance: tab.balance } } } throw new Error('Línea no encontrada.') }, cancelEmptyTab: async ({ tabId }) => { const tab = state().tabs.find((t) => t.id === tabId); if (!tab || tab.lines.length) throw new Error('La cuenta no está vacía.'); state().tabs = state().tabs.filter((t) => t.id !== tabId); return { tabId, cancelledAt: new Date().toISOString() } },
  }
  const shiftsApi: ShiftApi = {
    definitions: async () => shifts, current: async () => state().session,
    open: async (input) => openShift(state(), input),
    close: async ({ sessionId, countedCash, closingNote }) => { const session = state().session; if (!session || session.id !== sessionId) throw new Error('Turno no encontrado.'); session.status = 'closed'; session.closedAt = new Date().toISOString(); session.countedCash = countedCash; session.expectedCash = session.liveExpectedCash ?? session.openingCash; session.differenceCash = countedCash - session.expectedCash; session.closingNote = closingNote; return session },
    listHistory: async () => { const s = state().session; return s ? [{ id: s.id, shiftId: s.shiftId, shiftName: 'Turno demo', businessDate: s.businessDate, openedAt: s.openedAt, closedAt: s.closedAt, openedByUserId: s.openedByUserId, openedByLabel: 'Carlos Barra', openingCash: s.openingCash, openingCashNote: s.openingCashNote, closingNote: s.closingNote, expectedCash: s.expectedCash, countedCash: s.countedCash, differenceCash: s.differenceCash, pendingReconcileTotal: s.pendingReconcileTotal, status: s.status, liveExpectedCash: s.liveExpectedCash, livePendingReconcile: s.livePendingReconcile, cashSalesTotal: s.cashSalesTotal, cardSalesTotal: s.cardSalesTotal }] : [] }, listHistoryPaged: async (params: any) => paged(await shiftsApi.listHistory(), params?.page, params?.pageSize), getSessionDetail: async (id) => sessionDetail(state(), id),
  }
  const vip: VipCustomersApi = { list: async () => vipCustomers, listActive: async () => vipCustomers.filter((v) => v.isActive), listPaged: async (p: any) => paged(vipCustomers, p?.page, p?.pageSize), getById: async (id) => vipCustomers.find((v) => v.id === id) ?? unsupported('Cliente VIP'), create: async (input: VipCustomerInput) => { const item: VipCustomer = { ...input, id: vipCustomers.length + 1, documentId: input.documentId ?? null, phone: input.phone ?? null, notes: input.notes ?? null, isActive: input.isActive === false ? 0 : 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; vipCustomers.push(item); return item }, update: async (input) => Object.assign(vipCustomers.find((v) => v.id === input.id) ?? {}, input) as unknown as VipCustomer, remove: async () => undefined }
  const consumptions: ConsumptionsApi = { list: async () => consumptionRules, create: async () => unsupported('Reglas de consumo'), update: async () => unsupported('Reglas de consumo'), remove: async () => undefined, syncProductRules: async () => ({ success: true }), applyTemplate3060All: async () => ({ success: true, updatedProducts: 0 }) }
  const dashboard: DashboardApi = { getOverview: async (input) => { const s = state(); const paid = s.sales.filter((x) => x.saleType === 'pos').reduce((n, x) => n + x.total, 0); const overview: DashboardOverview = { input, kpis: { inventory: { totalProducts: products.length, lowStockCount: 0 }, receivables: { openTabsCount: s.tabs.length, pendingTotal: s.tabs.reduce((n, t) => n + t.balance, 0) }, sales: { paidTotal: paid, paidTransactions: s.sales.length, cashPaidTotal: s.session?.cashSalesTotal ?? 0, cardPaidTotal: s.session?.cardSalesTotal ?? 0, tabChargeTotal: s.sales.filter((x) => x.saleType === 'tab_charge').reduce((n, x) => n + x.total, 0), tabChargeTransactions: s.sales.filter((x) => x.saleType === 'tab_charge').length }, deltas: { inventoryTotalProductsDelta: null, inventoryLowStockDelta: null, receivablesPendingTotalDelta: null, salesPaidTotalDelta: null, salesTabChargeTotalDelta: null } }, dailySales: [], employees: [{ id: 1, displayName: 'Carlos Barra' }], topEmployees: [], topProducts: [] }; return overview } }
  const reports: ReportApi = { generateShiftClose: async (sessionId) => { const s = state().session; if (!s || s.id !== sessionId) throw new Error('Turno no encontrado.'); const { jsPDF } = await import('jspdf'); const pdf = new jsPDF(); pdf.text('System Barra — Cierre de turno', 20, 20); pdf.text(`Total efectivo: $${(s.cashSalesTotal ?? 0).toFixed(2)}`, 20, 32); pdf.save(`cierre-turno-${sessionId}.pdf`); return { sessionId, businessDate: s.businessDate, shiftName: 'Turno demo', closingNote: s.closingNote, inventory: [], replenishment: [], shiftCash: s.countedCash ?? 0, openingCash: s.openingCash, daySalesTotal: s.cashSalesTotal ?? 0, closedByLabel: 'Carlos Barra', currencyCode: DEMO_CURRENCY, shiftPendingReconcile: 0, closureAtLabel: s.closedAt, posSaleLines: [], tabChargeAccountsInSession: [], accountsPendingLiquidation: [], internalConsumptions: [], pdfPath: `cierre-turno-${sessionId}.pdf`, emailSentImmediately: true, reportRecipientEmail: 'demo@systembarra.app' } }, pendingEmails: async () => [], retryPendingEmails: async () => ({ processed: 0 }) }
  const license: LicenseApi = { getStatus: async () => licenseStatus, getFeatureFlags: async () => reportFlags, onOpenAdminPanel: () => () => undefined, validateSecretAccess: async () => unsupported('Licencia'), generatePanelAccessCode: async () => unsupported('Licencia'), activateByKey: async () => unsupported('Licencia'), activateManual: async () => unsupported('Licencia'), renew: async () => unsupported('Licencia'), cancel: async () => unsupported('Licencia') }
  const bom: BomApi = { getItemCount: async (id) => compoundBom.get(id) ?? 0, getItems: async () => [], upsert: async () => unsupported('BOM'), removeAll: async () => undefined, getVirtualStock: async () => unsupported('BOM') }
  const internalConsumptions: InternalConsumptionsApi = { create: async () => unsupported('Consumo interno'), getById: async () => unsupported('Consumo interno'), listPaged: async () => unsupported('Consumo interno'), cancel: async () => unsupported('Consumo interno') }
  const unavailable = <T,>(): T => new Proxy({}, { get: () => async () => unsupported('Esta sección') }) as T
  const users = unavailable<UserApi>(); const documents = unavailable<DocumentApi>(); const productsApi = unavailable<ProductApi>(); const inventory = unavailable<InventoryApi>(); const imageGallery = unavailable<ImageGalleryApi>()
  return { auth, setup, settings, sales, shifts: shiftsApi, vipCustomers: vip, consumptions, dashboard, reports, license, bom, internalConsumptions, users, documents, products: productsApi, inventory, imageGallery, reset: () => holder.reset() }
}
