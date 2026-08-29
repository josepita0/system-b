import type { CashSession, ShiftSessionDetail } from '@shared/types/shift'
import type { CreateSaleInput, CustomerTabSummary, SaleCreated, TabChargeDetail } from '@shared/types/sale'
import { categories, compoundBom, consumptionRules, DEMO_MANAGER, products, saleFormats, shifts, vipCustomers } from './seed'

export type DemoSale = SaleCreated & { input: CreateSaleInput; saleType: 'pos' | 'tab_charge' | 'tab_payment' }
export type DemoTab = CustomerTabSummary & { vipCustomerId: number | null; lines: Array<{ saleItemId: number; saleId: number; createdAt: string; productName: string; quantity: number; subtotal: number }> }
export type DemoState = { session: CashSession | null; sales: DemoSale[]; tabs: DemoTab[]; nextId: number }

const now = () => new Date().toISOString()
export function createDemoDb(): DemoState {
  return { session: null, sales: [], tabs: [], nextId: 100 }
}
export function createHolder() {
  let state = createDemoDb()
  return { get: () => state, reset: () => { state = createDemoDb(); return state } }
}
export function catalog() { return { categoryTree: categories, saleFormats } }
export function openShift(state: DemoState, input: { shiftCode: 'day' | 'night'; businessDate: string; openingCash: number; openingCashNote?: string | null }): CashSession {
  if (state.session?.status === 'open') throw new Error('Ya hay un turno abierto.')
  state.session = { id: 1, shiftId: shifts.find((s) => s.code === input.shiftCode)?.id ?? 1, businessDate: input.businessDate, openedAt: now(), closedAt: null, openingCash: input.openingCash, openingCashNote: input.openingCashNote ?? null, closingNote: null, expectedCash: null, countedCash: null, differenceCash: null, status: 'open', pendingReconcileTotal: 0, openedByUserId: DEMO_MANAGER.id, liveExpectedCash: input.openingCash, livePendingReconcile: 0, cashSalesTotal: 0, cardSalesTotal: 0 }
  return state.session
}
export function addSale(state: DemoState, input: CreateSaleInput): SaleCreated {
  if (!state.session || state.session.status !== 'open') throw new Error('No hay un turno abierto.')
  if (!input.items.length) throw new Error('La venta debe tener productos.')
  const realTotal = input.items.reduce((sum, item) => sum + (products.find((p) => p.id === item.productId)?.salePrice ?? 0) * item.quantity - (item.discount ?? 0), 0)
  const total = input.chargedTotal ?? realTotal
  const id = state.nextId++; const createdAt = now(); const paymentMethod = input.paymentMethod ?? 'CASH'
  const sale: DemoSale = { id, total, realTotal, chargedTotal: total, cashSessionId: state.session.id, createdAt, paymentMethod, input, saleType: input.tabId ? 'tab_charge' : 'pos' }
  state.sales.push(sale)
  if (input.tabId) {
    const tab = state.tabs.find((t) => t.id === input.tabId); if (!tab) throw new Error('Cuenta no encontrada.')
    for (const item of input.items) { const p = products.find((x) => x.id === item.productId)!; tab.lines.push({ saleItemId: state.nextId++, saleId: id, createdAt, productName: p.name, quantity: item.quantity, subtotal: item.chargedUnitPrice ?? p.salePrice }) }
    tab.balance += total
  } else if (paymentMethod === 'CASH') state.session.cashSalesTotal = (state.session.cashSalesTotal ?? 0) + total
  else state.session.cardSalesTotal = (state.session.cardSalesTotal ?? 0) + total
  state.session.liveExpectedCash = state.session.openingCash + (state.session.cashSalesTotal ?? 0)
  return sale
}
export function tabDetail(state: DemoState, id: number): TabChargeDetail { const tab = state.tabs.find((t) => t.id === id); if (!tab) throw new Error('Cuenta no encontrada.'); return { tabId: id, customerName: tab.customerName, vipCustomerId: tab.vipCustomerId, balance: tab.balance, lines: tab.lines } }
export function sessionDetail(state: DemoState, id: number): ShiftSessionDetail { const session = state.session; if (!session || session.id !== id) throw new Error('Turno no encontrado.'); return { session: { ...session, shiftName: shifts.find((s) => s.id === session.shiftId)?.name ?? 'Turno', openedByLabel: 'Carlos Barra' }, sales: [], tabs: state.tabs.map((t) => ({ id: t.id, customerName: t.customerName, status: 'open', openedAt: t.openedAt, settledAt: null, openedCashSessionId: id, settledCashSessionId: null, openedHere: true, settledHere: false })) } }
export const demoData = { catalog, products, saleFormats, categories, vipCustomers, shifts, consumptionRules, compoundBom }
