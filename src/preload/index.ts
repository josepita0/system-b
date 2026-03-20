import { contextBridge, ipcRenderer } from 'electron'
import { authChannels } from '../shared/ipc/auth'
import { documentChannels } from '../shared/ipc/documents'
import { licenseChannels, licenseEvents } from '../shared/ipc/license'
import { productChannels } from '../shared/ipc/products'
import { reportChannels } from '../shared/ipc/reports'
import { shiftChannels } from '../shared/ipc/shifts'
import { userChannels } from '../shared/ipc/users'

const api = {
  auth: {
    login: (payload: unknown) => ipcRenderer.invoke(authChannels.login, payload),
    logout: () => ipcRenderer.invoke(authChannels.logout),
    me: () => ipcRenderer.invoke(authChannels.me),
    changePassword: (payload: unknown) => ipcRenderer.invoke(authChannels.changePassword, payload),
    recoverPassword: (payload: unknown) => ipcRenderer.invoke(authChannels.recoverPassword, payload),
    bootstrapInfo: () => ipcRenderer.invoke(authChannels.bootstrapInfo),
  },
  license: {
    getStatus: () => ipcRenderer.invoke(licenseChannels.getStatus),
    getFeatureFlags: () => ipcRenderer.invoke(licenseChannels.getFeatureFlags),
    validateSecretAccess: (payload: unknown) => ipcRenderer.invoke(licenseChannels.validateSecretAccess, payload),
    activateByKey: (payload: unknown) => ipcRenderer.invoke(licenseChannels.activateByKey, payload),
    activateManual: (payload: unknown) => ipcRenderer.invoke(licenseChannels.activateManual, payload),
    renew: (payload: unknown) => ipcRenderer.invoke(licenseChannels.renew, payload),
    cancel: (payload: unknown) => ipcRenderer.invoke(licenseChannels.cancel, payload),
    onOpenAdminPanel: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on(licenseEvents.openAdminPanel, listener)
      return () => {
        ipcRenderer.removeListener(licenseEvents.openAdminPanel, listener)
      }
    },
  },
  users: {
    list: () => ipcRenderer.invoke(userChannels.list),
    getById: (id: number) => ipcRenderer.invoke(userChannels.getById, id),
    create: (payload: unknown) => ipcRenderer.invoke(userChannels.create, payload),
    update: (payload: unknown) => ipcRenderer.invoke(userChannels.update, payload),
    myProfile: () => ipcRenderer.invoke(userChannels.myProfile),
    issueCredentials: (userId: number) => ipcRenderer.invoke(userChannels.issueCredentials, userId),
    regenerateRecoveryCodes: (userId: number) => ipcRenderer.invoke(userChannels.regenerateRecoveryCodes, userId),
  },
  documents: {
    myDocuments: () => ipcRenderer.invoke(documentChannels.myDocuments),
    uploadForCurrentUser: (documentType: string) => ipcRenderer.invoke(documentChannels.uploadForCurrentUser, documentType),
    remove: (documentId: number) => ipcRenderer.invoke(documentChannels.remove, documentId),
  },
  products: {
    list: () => ipcRenderer.invoke(productChannels.list),
    getById: (id: number) => ipcRenderer.invoke(productChannels.getById, id),
    create: (payload: unknown) => ipcRenderer.invoke(productChannels.create, payload),
    update: (payload: unknown) => ipcRenderer.invoke(productChannels.update, payload),
    remove: (id: number) => ipcRenderer.invoke(productChannels.remove, id),
  },
  shifts: {
    definitions: () => ipcRenderer.invoke(shiftChannels.definitions),
    current: () => ipcRenderer.invoke(shiftChannels.current),
    open: (payload: unknown) => ipcRenderer.invoke(shiftChannels.open, payload),
    close: (payload: unknown) => ipcRenderer.invoke(shiftChannels.close, payload),
  },
  reports: {
    generateShiftClose: (sessionId: number) => ipcRenderer.invoke(reportChannels.generateShiftClose, sessionId),
    pendingEmails: () => ipcRenderer.invoke(reportChannels.pendingEmails),
    retryPendingEmails: () => ipcRenderer.invoke(reportChannels.retryPendingEmails),
  },
}

contextBridge.exposeInMainWorld('api', api)
