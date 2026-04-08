import { z } from 'zod'

const bomItemSchema = z.object({
  componentProductId: z.number().int().positive(),
  quantityPerUnit: z.number().positive(),
})

export const bomUpsertSchema = z.object({
  parentProductId: z.number().int().positive(),
  items: z.array(bomItemSchema).max(60),
})

