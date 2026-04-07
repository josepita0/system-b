import { ipcMain } from 'electron'
import { dashboardChannels } from '../../shared/ipc/dashboard'
import { parseDashboardOverviewInput } from '../../shared/schemas/dashboardSchema'
import { getDb } from '../database/connection'
import { AuthService } from '../services/authService'
import { AuthorizationService } from '../services/authorizationService'
import { DashboardService } from '../services/dashboardService'
import { createIpcGuards } from './guards'
import { executeIpc } from './response'

export function registerDashboardHandlers() {
  const db = getDb()
  const auth = new AuthService(db)
  const guards = createIpcGuards(auth, new AuthorizationService())
  const service = new DashboardService(db)

  ipcMain.handle(dashboardChannels.getOverview, (_event, raw: unknown) =>
    executeIpc(() => {
      guards.requirePermission('sales.use')
      guards.requirePermission('inventory.view')
      const input = parseDashboardOverviewInput(raw)
      return service.getOverview(input)
    }),
  )
}

