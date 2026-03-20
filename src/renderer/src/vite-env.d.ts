/// <reference types="vite/client" />

import type { AuthApi } from '@shared/ipc/auth'
import type { DocumentApi } from '@shared/ipc/documents'
import type { LicenseApi } from '@shared/ipc/license'
import type { ProductApi } from '@shared/ipc/products'
import type { ReportApi } from '@shared/ipc/reports'
import type { ShiftApi } from '@shared/ipc/shifts'
import type { UserApi } from '@shared/ipc/users'

declare global {
  interface Window {
    api: {
      auth: AuthApi
      license: LicenseApi
      users: UserApi
      documents: DocumentApi
      products: ProductApi
      shifts: ShiftApi
      reports: ReportApi
    }
  }
}

export {}
