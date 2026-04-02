import { registerAuthHandlers } from './authHandlers'
import { registerDocumentHandlers } from './documentHandlers'
import { registerLicenseHandlers } from './licenseHandlers'
import { registerProductHandlers } from './productHandlers'
import { registerReportHandlers } from './reportHandlers'
import { registerSaleHandlers } from './saleHandlers'
import { registerSetupHandlers } from './setupHandlers'
import { registerShiftHandlers } from './shiftHandlers'
import { registerUserHandlers } from './userHandlers'
import { registerVipCustomerHandlers } from './vipCustomerHandlers'
import { registerInventoryHandlers } from './inventoryHandlers'
import { registerConsumptionHandlers } from './consumptionHandlers'

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
  registerVipCustomerHandlers()
  registerInventoryHandlers()
  registerConsumptionHandlers()
}
