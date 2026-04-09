import { z } from 'zod'

export const createSaleLineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  discount: z.number().min(0).optional().default(0),
  saleFormatId: z.number().int().positive().optional().nullable(),
  complementProductId: z.number().int().positive().optional().nullable(),
  /** Precio unitario efectivo (si difiere del catalogo, puede exigirse nota según reglas de negocio). */
  chargedUnitPrice: z.number().min(0).optional(),
  /** Motivo del cambio de precio respecto al catalogo (obligatorio para cliente no VIP si hay cambio). */
  priceChangeNote: z.string().trim().max(500).optional().nullable(),
})

export const createSaleSchema = z.object({
  items: z.array(createSaleLineSchema).min(1, 'Debe incluir al menos una linea.'),
  tabId: z.number().int().positive().optional(),
  vipCustomerId: z.number().int().positive().optional(),
  chargedTotal: z.number().nonnegative().optional(),
})

export const openTabSchema = z
  .object({
    customerName: z.string().trim().max(200),
    vipCustomerId: z.number().int().positive().optional(),
  })
  .refine((data) => data.customerName.length > 0 || data.vipCustomerId != null, {
    message: 'Indique el nombre del cliente o seleccione un cliente VIP.',
    path: ['customerName'],
  })

export const settleTabSchema = z.object({
  tabId: z.number().int().positive(),
})

export const removeTabChargeLineSchema = z.object({
  saleItemId: z.number().int().positive(),
  reason: z.string().trim().max(2000).optional(),
})

export const cancelEmptyTabSchema = z.object({
  tabId: z.number().int().positive(),
  reason: z.string().trim().min(1, 'Indique el motivo de la cancelación.').max(2000),
})
