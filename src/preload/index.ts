import { contextBridge, ipcRenderer } from 'electron'
import type { IpcResult } from '../shared/ipc/result'
import { authChannels } from '../shared/ipc/auth'
import { documentChannels } from '../shared/ipc/documents'
import { licenseChannels, licenseEvents } from '../shared/ipc/license'
import { productChannels } from '../shared/ipc/products'
import { reportChannels } from '../shared/ipc/reports'
import { salesChannels } from '../shared/ipc/sales'
import { setupChannels } from '../shared/ipc/setup'
import { shiftChannels } from '../shared/ipc/shifts'
import { userChannels } from '../shared/ipc/users'
import { vipCustomerChannels } from '../shared/ipc/vipCustomers'
import { inventoryChannels } from '../shared/ipc/inventory'
import { consumptionChannels } from '../shared/ipc/consumptions'

async function invokeIpc<T>(channel: string, ...args: unknown[]) {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (result.ok) {
    return result.data
  }

  const error = new Error(result.error.message) as Error & { code?: string; status?: number }
  error.name = result.error.code
  error.code = result.error.code
  error.status = result.error.status
  throw error
}

const api = {
  auth: {
    login: (payload: unknown) => invokeIpc(authChannels.login, payload),
    logout: () => invokeIpc(authChannels.logout),
    me: () => invokeIpc(authChannels.me),
    changePassword: (payload: unknown) => invokeIpc(authChannels.changePassword, payload),
    recoverPassword: (payload: unknown) => invokeIpc(authChannels.recoverPassword, payload),
  },
  license: {
    getStatus: () => invokeIpc(licenseChannels.getStatus),
    getFeatureFlags: () => invokeIpc(licenseChannels.getFeatureFlags),
    validateSecretAccess: (payload: unknown) => invokeIpc(licenseChannels.validateSecretAccess, payload),
    activateByKey: (payload: unknown) => invokeIpc(licenseChannels.activateByKey, payload),
    activateManual: (payload: unknown) => invokeIpc(licenseChannels.activateManual, payload),
    renew: (payload: unknown) => invokeIpc(licenseChannels.renew, payload),
    cancel: (payload: unknown) => invokeIpc(licenseChannels.cancel, payload),
    onOpenAdminPanel: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on(licenseEvents.openAdminPanel, listener)
      return () => {
        ipcRenderer.removeListener(licenseEvents.openAdminPanel, listener)
      }
    },
  },
  users: {
    list: () => invokeIpc(userChannels.list),
    getById: (id: number) => invokeIpc(userChannels.getById, id),
    create: (payload: unknown) => invokeIpc(userChannels.create, payload),
    update: (payload: unknown) => invokeIpc(userChannels.update, payload),
    myProfile: () => invokeIpc(userChannels.myProfile),
    issueCredentials: (userId: number) => invokeIpc(userChannels.issueCredentials, userId),
    regenerateRecoveryCodes: (userId: number) => invokeIpc(userChannels.regenerateRecoveryCodes, userId),
  },
  documents: {
    myDocuments: () => invokeIpc(documentChannels.myDocuments),
    uploadForCurrentUser: (documentType: string) => invokeIpc(documentChannels.uploadForCurrentUser, documentType),
    remove: (documentId: number) => invokeIpc(documentChannels.remove, documentId),
  },
  products: {
    list: (categoryId?: number) => invokeIpc(productChannels.list, categoryId),
    getById: (id: number) => invokeIpc(productChannels.getById, id),
    create: (payload: unknown) => invokeIpc(productChannels.create, payload),
    update: (payload: unknown) => invokeIpc(productChannels.update, payload),
    remove: (id: number) => invokeIpc(productChannels.remove, id),
    listCategories: () => invokeIpc(productChannels.listCategories),
    createCategory: (payload: unknown) => invokeIpc(productChannels.createCategory, payload),
    updateCategory: (payload: unknown) => invokeIpc(productChannels.updateCategory, payload),
    removeCategory: (id: number) => invokeIpc(productChannels.removeCategory, id),
    listSaleFormats: () => invokeIpc(productChannels.listSaleFormats),
    createSaleFormat: (payload: unknown) => invokeIpc(productChannels.createSaleFormat, payload),
    updateSaleFormat: (payload: unknown) => invokeIpc(productChannels.updateSaleFormat, payload),
    removeSaleFormat: (id: number) => invokeIpc(productChannels.removeSaleFormat, id),
    setCategorySaleFormats: (payload: unknown) => invokeIpc(productChannels.setCategorySaleFormats, payload),
  },
  sales: {
    posCatalog: () => invokeIpc(salesChannels.posCatalog),
    posProducts: (categoryId: number) => invokeIpc(salesChannels.posProducts, categoryId),
    posComplementProducts: (rootCategoryId: number) => invokeIpc(salesChannels.posComplementProducts, rootCategoryId),
    create: (payload: unknown) => invokeIpc(salesChannels.create, payload),
    openTab: (payload: unknown) => invokeIpc(salesChannels.openTab, payload),
    listOpenTabs: () => invokeIpc(salesChannels.listOpenTabs),
    settleTab: (payload: unknown) => invokeIpc(salesChannels.settleTab, payload),
  },
  shifts: {
    definitions: () => invokeIpc(shiftChannels.definitions),
    current: () => invokeIpc(shiftChannels.current),
    open: (payload: unknown) => invokeIpc(shiftChannels.open, payload),
    close: (payload: unknown) => invokeIpc(shiftChannels.close, payload),
    listHistory: () => invokeIpc(shiftChannels.listHistory),
    getSessionDetail: (sessionId: number) => invokeIpc(shiftChannels.getSessionDetail, sessionId),
  },
  reports: {
    generateShiftClose: (sessionId: number) => invokeIpc(reportChannels.generateShiftClose, sessionId),
    pendingEmails: () => invokeIpc(reportChannels.pendingEmails),
    retryPendingEmails: () => invokeIpc(reportChannels.retryPendingEmails),
  },
  setup: {
    getStatus: () => invokeIpc(setupChannels.getStatus),
    complete: () => invokeIpc(setupChannels.complete),
  },
  vipCustomers: {
    list: () => invokeIpc(vipCustomerChannels.list),
    listActive: () => invokeIpc(vipCustomerChannels.listActive),
    getById: (id: number) => invokeIpc(vipCustomerChannels.getById, id),
    create: (payload: unknown) => invokeIpc(vipCustomerChannels.create, payload),
    update: (payload: unknown) => invokeIpc(vipCustomerChannels.update, payload),
    remove: (id: number) => invokeIpc(vipCustomerChannels.remove, id),
  },
  inventory: {
    listBalance: () => invokeIpc(inventoryChannels.listBalance),
    postOpening: (payload: unknown) => invokeIpc(inventoryChannels.postOpening, payload),
    postEntry: (payload: unknown) => invokeIpc(inventoryChannels.postEntry, payload),
    postAdjustment: (payload: unknown) => invokeIpc(inventoryChannels.postAdjustment, payload),
    listLots: (ingredientId: number) => invokeIpc(inventoryChannels.listLots, ingredientId),
    createLots: (payload: unknown) => invokeIpc(inventoryChannels.createLots, payload),
    updateIngredientProgressiveConfig: (payload: unknown) =>
      invokeIpc(inventoryChannels.updateIngredientProgressiveConfig, payload),
  },
  consumptions: {
    list: () => invokeIpc(consumptionChannels.list),
    create: (payload: unknown) => invokeIpc(consumptionChannels.create, payload),
    update: (payload: unknown) => invokeIpc(consumptionChannels.update, payload),
    remove: (id: number) => invokeIpc(consumptionChannels.remove, id),
  },
}

contextBridge.exposeInMainWorld('api', api)
