import { registerAuthHandlers } from './authHandlers'
import { registerDocumentHandlers } from './documentHandlers'
import { registerLicenseHandlers } from './licenseHandlers'
import { registerProductHandlers } from './productHandlers'
import { registerReportHandlers } from './reportHandlers'
import { registerSaleHandlers } from './saleHandlers'
import { registerSetupHandlers } from './setupHandlers'
import { registerShiftHandlers } from './shiftHandlers'
import { registerUserHandlers } from './userHandlers'

export function registerIpcHandlers() {
  registerAuthHandlers()
  registerUserHandlers()
  registerDocumentHandlers()
  registerLicenseHandlers()
  registerProductHandlers()
  registerSaleHandlers()
  registerShiftHandlers()
  registerReportHandlers()
  registerSetupHandlers()
}
