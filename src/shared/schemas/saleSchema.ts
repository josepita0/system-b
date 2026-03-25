import { z } from 'zod'

export const createSaleLineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  discount: z.number().min(0).optional().default(0),
  saleFormatId: z.number().int().positive().optional().nullable(),
  complementProductId: z.number().int().positive().optional().nullable(),
})

export const createSaleSchema = z.object({
  items: z.array(createSaleLineSchema).min(1, 'Debe incluir al menos una linea.'),
})
