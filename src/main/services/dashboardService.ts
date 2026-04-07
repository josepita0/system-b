import type Database from 'better-sqlite3'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { TabRepository } from '../repositories/tabRepository'
import { DashboardRepository } from '../repositories/dashboardRepository'
import type { DashboardOverview, DashboardOverviewInput } from '../../shared/types/dashboard'

function parseIsoDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

function toIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number) {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

function daysInclusive(fromIso: string, toIso: string) {
  const a = parseIsoDate(fromIso)
  const b = parseIsoDate(toIso)
  const ms = b.getTime() - a.getTime()
  const days = Math.floor(ms / 86_400_000) + 1
  return Math.max(1, days)
}

export class DashboardService {
  private readonly inventoryRepo: ProductInventoryRepository
  private readonly tabRepo: TabRepository
  private readonly repo: DashboardRepository

  constructor(db: Database.Database) {
    this.inventoryRepo = new ProductInventoryRepository(db)
    this.tabRepo = new TabRepository(db)
    this.repo = new DashboardRepository(db)
  }

  getOverview(input: DashboardOverviewInput): DashboardOverview {
    const inventory = this.inventoryRepo.balanceSummary()
    const openTabs = this.tabRepo.listOpenWithBalances()
    const pendingTotal = openTabs.reduce((acc, t) => acc + Number(t.balance ?? 0), 0)

    const employees = this.repo.listEmployees().map((e) => ({
      id: e.id,
      displayName: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || `Empleado #${e.id}`,
    }))

    const employeeId = input.employeeId

    const totals = this.repo.getSalesTotals({ from: input.from, to: input.to, employeeId })
    const dayCount = daysInclusive(input.from, input.to)
    const prevTo = toIsoDate(addDays(parseIsoDate(input.from), -1))
    const prevFrom = toIsoDate(addDays(parseIsoDate(prevTo), -(dayCount - 1)))
    const prevTotals = this.repo.getSalesTotals({ from: prevFrom, to: prevTo, employeeId })

    const dailySales = this.repo.listDailySales({ from: input.from, to: input.to, employeeId }).map((r) => ({
      businessDate: r.businessDate as any,
      paidTotal: Number(r.paidTotal ?? 0),
      paidTransactions: Number(r.paidTransactions ?? 0),
      tabChargeTotal: Number(r.tabChargeTotal ?? 0),
      tabChargeTransactions: Number(r.tabChargeTransactions ?? 0),
    }))

    const topEmployeesRaw = this.repo.listTopEmployees({ from: input.from, to: input.to, limit: 7 })
    const paidDen = totals.paidTotal > 0 ? totals.paidTotal : 0
    const topEmployees = topEmployeesRaw.map((r) => {
      const displayName = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || `Empleado #${r.employeeId}`
      return {
        employeeId: r.employeeId,
        displayName,
        paidTotal: Number(r.paidTotal ?? 0),
        paidTransactions: Number(r.paidTransactions ?? 0),
        tabChargeTotal: Number(r.tabChargeTotal ?? 0),
        tabChargeTransactions: Number(r.tabChargeTransactions ?? 0),
        paidPctOfTotal: paidDen ? Number(r.paidTotal ?? 0) / paidDen : 0,
      }
    })

    const topProductsRaw = this.repo.listTopProducts({ from: input.from, to: input.to, employeeId, limit: 10 })
    const maxQty = Math.max(0, ...topProductsRaw.map((p) => Number(p.quantitySold ?? 0)))
    const topProducts = topProductsRaw.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      quantitySold: Number(p.quantitySold ?? 0),
      revenuePaid: Number(p.revenuePaid ?? 0),
      revenueTabCharge: Number(p.revenueTabCharge ?? 0),
      barPct: maxQty ? Number(p.quantitySold ?? 0) / maxQty : 0,
    }))

    return {
      input,
      kpis: {
        inventory: {
          totalProducts: inventory.totalProducts,
          lowStockCount: inventory.lowStockCount,
        },
        receivables: {
          openTabsCount: openTabs.length,
          pendingTotal,
        },
        sales: {
          paidTotal: Number(totals.paidTotal ?? 0),
          paidTransactions: Number(totals.paidTransactions ?? 0),
          tabChargeTotal: Number(totals.tabChargeTotal ?? 0),
          tabChargeTransactions: Number(totals.tabChargeTransactions ?? 0),
        },
        deltas: {
          inventoryTotalProductsDelta: null,
          inventoryLowStockDelta: null,
          receivablesPendingTotalDelta: null,
          salesPaidTotalDelta: Number(totals.paidTotal ?? 0) - Number(prevTotals.paidTotal ?? 0),
          salesTabChargeTotalDelta: Number(totals.tabChargeTotal ?? 0) - Number(prevTotals.tabChargeTotal ?? 0),
        },
      },
      dailySales,
      employees,
      topEmployees,
      topProducts,
    }
  }
}

