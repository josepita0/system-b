import { z } from 'zod'

export const productSchema = z.object({
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(120),
  type: z.enum(['simple', 'compound']),
  salePrice: z.number().nonnegative(),
  minStock: z.number().int().nonnegative(),
})

export const productUpdateSchema = productSchema.extend({
  id: z.number().int().positive(),
})
