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
  tabId: z.number().int().positive().optional(),
  vipCustomerId: z.number().int().positive().optional(),
  chargedTotal: z.number().nonnegative().optional(),
})

export const openTabSchema = z.object({
  customerName: z.string().trim().min(1, 'Indique el nombre del cliente.').max(200),
})

export const settleTabSchema = z.object({
  tabId: z.number().int().positive(),
})
