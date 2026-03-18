import { z } from 'zod'

export const openShiftSchema = z.object({
  shiftCode: z.enum(['day', 'night']),
  businessDate: z.string().min(10).max(10),
  openingCash: z.number().nonnegative(),
})

export const closeShiftSchema = z.object({
  sessionId: z.number().int().positive(),
  countedCash: z.number().nonnegative(),
})
