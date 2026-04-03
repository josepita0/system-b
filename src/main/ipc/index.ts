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
import { registerSettingsHandlers } from './settingsHandlers'

export function registerIpcHandlers() {
  registerAuthHandlers()
  registerUserHandlers()
  registerDocumentHandlers()
  registerLicenseHandlers()
  registerProductHandlers()
  registerSaleHandlers()
  registerShiftHandlers()
  registerReportHandlers()
  registerSettingsHandlers()
  registerSetupHandlers()
  registerVipCustomerHandlers()
  registerInventoryHandlers()
  registerConsumptionHandlers()
}
