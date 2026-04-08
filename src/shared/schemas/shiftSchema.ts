import { z } from 'zod'

export const openShiftSchema = z.object({
  shiftCode: z.enum(['day', 'night']),
  businessDate: z.string().min(10).max(10),
  openingCash: z.number().nonnegative(),
  openingCashNote: z.union([z.string().max(2000), z.null()]).optional(),
})

export const closeShiftSchema = z.object({
  sessionId: z.number().int().positive(),
  countedCash: z.number().nonnegative(),
  closingNote: z.string().trim().min(1, 'Indique una nota de cierre.').max(2000),
})
