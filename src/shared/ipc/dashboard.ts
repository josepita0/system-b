import type { DashboardOverview, DashboardOverviewInput } from '../types/dashboard'

export const dashboardChannels = {
  getOverview: 'dashboard:getOverview',
} as const

export interface DashboardApi {
  getOverview: (params: DashboardOverviewInput) => Promise<DashboardOverview>
}

