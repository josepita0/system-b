export type IsoDate = `${number}-${number}-${number}`

export type DashboardOverviewInput = {
  from: IsoDate
  to: IsoDate
  employeeId?: number
}

export type DashboardKpis = {
  inventory: {
    totalProducts: number
    lowStockCount: number
  }
  receivables: {
    openTabsCount: number
    pendingTotal: number
  }
  sales: {
    paidTotal: number
    paidTransactions: number
    tabChargeTotal: number
    tabChargeTransactions: number
  }
  deltas: {
    inventoryTotalProductsDelta: number | null
    inventoryLowStockDelta: number | null
    receivablesPendingTotalDelta: number | null
    salesPaidTotalDelta: number | null
    salesTabChargeTotalDelta: number | null
  }
}

export type DashboardDailySalesRow = {
  businessDate: IsoDate
  paidTotal: number
  paidTransactions: number
  tabChargeTotal: number
  tabChargeTransactions: number
}

export type DashboardEmployeeOption = {
  id: number
  displayName: string
}

export type DashboardTopEmployeeRow = {
  employeeId: number
  displayName: string
  paidTotal: number
  paidTransactions: number
  tabChargeTotal: number
  tabChargeTransactions: number
  paidPctOfTotal: number
}

export type DashboardTopProductRow = {
  productId: number
  productName: string
  quantitySold: number
  revenuePaid: number
  revenueTabCharge: number
  barPct: number
}

export type DashboardOverview = {
  input: DashboardOverviewInput
  kpis: DashboardKpis
  dailySales: DashboardDailySalesRow[]
  employees: DashboardEmployeeOption[]
  topEmployees: DashboardTopEmployeeRow[]
  topProducts: DashboardTopProductRow[]
}

