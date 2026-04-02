import { z } from 'zod'

export const vipCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  documentId: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  conditionType: z.enum(['discount_manual', 'exempt']),
  isActive: z.boolean().optional().default(true),
})

export const vipCustomerUpdateSchema = vipCustomerSchema.extend({
  id: z.number().int().positive(),
})

