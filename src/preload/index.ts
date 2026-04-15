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
import { settingsChannels } from '../shared/ipc/settings'
import { dashboardChannels } from '../shared/ipc/dashboard'
import { internalConsumptionChannels } from '../shared/ipc/internalConsumptions'
import { bomChannels } from '../shared/ipc/bom'
import { imageGalleryChannels } from '../shared/ipc/imageGallery'

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
    requestPasswordResetEmailCode: (payload: unknown) => invokeIpc(authChannels.requestPasswordResetEmailCode, payload),
    resetPasswordWithEmailCode: (payload: unknown) => invokeIpc(authChannels.resetPasswordWithEmailCode, payload),
    verifyPassword: (payload: unknown) => invokeIpc(authChannels.verifyPassword, payload),
  },
  license: {
    getStatus: () => invokeIpc(licenseChannels.getStatus),
    getFeatureFlags: () => invokeIpc(licenseChannels.getFeatureFlags),
    validateSecretAccess: (payload: unknown) => invokeIpc(licenseChannels.validateSecretAccess, payload),
    generatePanelAccessCode: (payload: unknown) => invokeIpc(licenseChannels.generatePanelAccessCode, payload),
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
    listPaged: (params: unknown) => invokeIpc(userChannels.listPaged, params),
    getById: (id: number) => invokeIpc(userChannels.getById, id),
    create: (payload: unknown) => invokeIpc(userChannels.create, payload),
    update: (payload: unknown) => invokeIpc(userChannels.update, payload),
    myProfile: () => invokeIpc(userChannels.myProfile),
    issueCredentials: (userId: number) => invokeIpc(userChannels.issueCredentials, userId),
    regenerateRecoveryCodes: (userId: number) => invokeIpc(userChannels.regenerateRecoveryCodes, userId),
    sendPasswordResetEmailCode: (userId: number) => invokeIpc(userChannels.sendPasswordResetEmailCode, userId),
  },
  documents: {
    myDocuments: () => invokeIpc(documentChannels.myDocuments),
    uploadForCurrentUser: (documentType: string) => invokeIpc(documentChannels.uploadForCurrentUser, documentType),
    remove: (documentId: number) => invokeIpc(documentChannels.remove, documentId),
  },
  products: {
    list: (categoryId?: number) => invokeIpc(productChannels.list, categoryId),
    listPaged: (params: unknown) => invokeIpc(productChannels.listPaged, params),
    listProgressivePaged: (params: unknown) => invokeIpc(productChannels.listProgressivePaged, params),
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
    setCategoryImage: (categoryId: number) => invokeIpc(productChannels.setCategoryImage, categoryId),
    clearCategoryImage: (categoryId: number) => invokeIpc(productChannels.clearCategoryImage, categoryId),
    setCategoryPdf: (categoryId: number) => invokeIpc(productChannels.setCategoryPdf, categoryId),
    clearCategoryPdf: (categoryId: number) => invokeIpc(productChannels.clearCategoryPdf, categoryId),
    setProductImage: (productId: number) => invokeIpc(productChannels.setProductImage, productId),
    clearProductImage: (productId: number) => invokeIpc(productChannels.clearProductImage, productId),
    setProductPdf: (productId: number) => invokeIpc(productChannels.setProductPdf, productId),
    clearProductPdf: (productId: number) => invokeIpc(productChannels.clearProductPdf, productId),
    openCatalogPdf: (relPath: string) => invokeIpc(productChannels.openCatalogPdf, relPath),
  },
  sales: {
    posCatalog: () => invokeIpc(salesChannels.posCatalog),
    posProducts: (payload: unknown) => invokeIpc(salesChannels.posProducts, payload),
    posInternalConsumptionProducts: (payload: unknown) => invokeIpc(salesChannels.posInternalConsumptionProducts, payload),
    posComplementProducts: (rootCategoryId: number) => invokeIpc(salesChannels.posComplementProducts, rootCategoryId),
    create: (payload: unknown) => invokeIpc(salesChannels.create, payload),
    openTab: (payload: unknown) => invokeIpc(salesChannels.openTab, payload),
    listOpenTabs: () => invokeIpc(salesChannels.listOpenTabs),
    settleTab: (payload: unknown) => invokeIpc(salesChannels.settleTab, payload),
    tabChargeDetail: (tabId: number) => invokeIpc(salesChannels.tabChargeDetail, tabId),
    removeTabChargeLine: (payload: unknown) => invokeIpc(salesChannels.removeTabChargeLine, payload),
    cancelEmptyTab: (payload: unknown) => invokeIpc(salesChannels.cancelEmptyTab, payload),
  },
  shifts: {
    definitions: () => invokeIpc(shiftChannels.definitions),
    current: () => invokeIpc(shiftChannels.current),
    open: (payload: unknown) => invokeIpc(shiftChannels.open, payload),
    close: (payload: unknown) => invokeIpc(shiftChannels.close, payload),
    listHistory: () => invokeIpc(shiftChannels.listHistory),
    listHistoryPaged: (params: unknown) => invokeIpc(shiftChannels.listHistoryPaged, params),
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
    listPaged: (params: unknown) => invokeIpc(vipCustomerChannels.listPaged, params),
    listActive: () => invokeIpc(vipCustomerChannels.listActive),
    getById: (id: number) => invokeIpc(vipCustomerChannels.getById, id),
    create: (payload: unknown) => invokeIpc(vipCustomerChannels.create, payload),
    update: (payload: unknown) => invokeIpc(vipCustomerChannels.update, payload),
    remove: (id: number) => invokeIpc(vipCustomerChannels.remove, id),
  },
  inventory: {
    listBalance: () => invokeIpc(inventoryChannels.listBalance),
    balanceSummary: () => invokeIpc(inventoryChannels.balanceSummary),
    listBalancePaged: (params: unknown) => invokeIpc(inventoryChannels.listBalancePaged, params),
    listMovementHistory: (limit?: number) => invokeIpc(inventoryChannels.listMovementHistory, limit),
    listMovementHistoryPaged: (params: unknown) => invokeIpc(inventoryChannels.listMovementHistoryPaged, params),
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
    syncProductRules: (payload: unknown) => invokeIpc(consumptionChannels.syncProductRules, payload),
    applyTemplate3060All: () => invokeIpc(consumptionChannels.applyTemplate3060All),
  },
  settings: {
    getSmtpSettings: () => invokeIpc(settingsChannels.getSmtpSettings),
    updateSmtpSettings: (payload: unknown) => invokeIpc(settingsChannels.updateSmtpSettings, payload),
    testSmtp: () => invokeIpc(settingsChannels.testSmtp),
    getCashSettings: () => invokeIpc(settingsChannels.getCashSettings),
    updateCashSettings: (payload: unknown) => invokeIpc(settingsChannels.updateCashSettings, payload),
  },
  dashboard: {
    getOverview: (params: unknown) => invokeIpc(dashboardChannels.getOverview, params),
  },
  internalConsumptions: {
    create: (payload: unknown) => invokeIpc(internalConsumptionChannels.create, payload),
    getById: (id: number) => invokeIpc(internalConsumptionChannels.getById, id),
    listPaged: (params: unknown) => invokeIpc(internalConsumptionChannels.listPaged, params),
    cancel: (payload: unknown) => invokeIpc(internalConsumptionChannels.cancel, payload),
  },
  bom: {
    getItems: (parentProductId: number) => invokeIpc(bomChannels.getItems, parentProductId),
    upsert: (payload: unknown) => invokeIpc(bomChannels.upsert, payload),
    removeAll: (parentProductId: number) => invokeIpc(bomChannels.removeAll, parentProductId),
    getVirtualStock: (parentProductId: number) => invokeIpc(bomChannels.getVirtualStock, parentProductId),
  },
  imageGallery: {
    pickFiles: () => invokeIpc(imageGalleryChannels.pickFiles),
    pickFolder: () => invokeIpc(imageGalleryChannels.pickFolder),
    importFiles: (filePaths: string[]) => invokeIpc(imageGalleryChannels.importFiles, filePaths),
    importFolder: (folderPath: string) => invokeIpc(imageGalleryChannels.importFolder, folderPath),
    list: (params: unknown) => invokeIpc(imageGalleryChannels.list, params),
    updateMetadata: (id: number, patch: unknown) => invokeIpc(imageGalleryChannels.updateMetadata, id, patch),
    deleteBatch: (ids: number[]) => invokeIpc(imageGalleryChannels.deleteBatch, ids),
    linkToProduct: (payload: unknown) => invokeIpc(imageGalleryChannels.linkToProduct, payload),
    unlinkFromProduct: (payload: unknown) => invokeIpc(imageGalleryChannels.unlinkFromProduct, payload),
    setPrimaryForProduct: (payload: unknown) => invokeIpc(imageGalleryChannels.setPrimaryForProduct, payload),
  },
}

contextBridge.exposeInMainWorld('api', api)
