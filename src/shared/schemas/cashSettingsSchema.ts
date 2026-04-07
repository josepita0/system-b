import { z } from 'zod'

export const updateCashSettingsSchema = z.object({
  minOpeningCash: z.number().finite().nonnegative(),
})

