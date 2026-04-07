import { z } from 'zod'
import type { DashboardOverviewInput } from '../types/dashboard'

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((s) => s as DashboardOverviewInput['from'])

export const dashboardOverviewInputSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  employeeId: z.number().int().positive().optional(),
})

export type DashboardOverviewInputParsed = z.infer<typeof dashboardOverviewInputSchema>

export function parseDashboardOverviewInput(raw: unknown): DashboardOverviewInputParsed {
  return dashboardOverviewInputSchema.parse(raw ?? {})
}

