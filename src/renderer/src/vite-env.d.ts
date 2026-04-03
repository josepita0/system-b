/// <reference types="vite/client" />

import type { AuthApi } from '@shared/ipc/auth'
import type { DocumentApi } from '@shared/ipc/documents'
import type { LicenseApi } from '@shared/ipc/license'
import type { ProductApi } from '@shared/ipc/products'
import type { ReportApi } from '@shared/ipc/reports'
import type { SalesApi } from '@shared/ipc/sales'
import type { SetupApi } from '@shared/ipc/setup'
import type { ShiftApi } from '@shared/ipc/shifts'
import type { UserApi } from '@shared/ipc/users'
import type { VipCustomersApi } from '@shared/ipc/vipCustomers'
import type { InventoryApi } from '@shared/ipc/inventory'
import type { ConsumptionsApi } from '@shared/ipc/consumptions'
import type { SettingsApi } from '@shared/ipc/settings'

declare global {
  interface Window {
    api: {
      auth: AuthApi
      license: LicenseApi
      users: UserApi
      documents: DocumentApi
      products: ProductApi
      sales: SalesApi
      shifts: ShiftApi
      reports: ReportApi
      setup: SetupApi
      vipCustomers: VipCustomersApi
      inventory: InventoryApi
      consumptions: ConsumptionsApi
      settings: SettingsApi
    }
  }
}

export {}
