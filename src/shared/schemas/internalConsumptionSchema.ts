import { z } from 'zod'

const lineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  note: z.string().trim().max(400).nullable().optional(),
})

export const createInternalConsumptionSchema = z.object({
  reason: z.string().trim().min(1).max(220),
  attachToCurrentCashSession: z.boolean().optional().default(true),
  items: z.array(lineSchema).min(1).max(200),
})

export const cancelInternalConsumptionSchema = z.object({
  id: z.number().int().positive(),
  reason: z.string().trim().min(1).max(220),
})

