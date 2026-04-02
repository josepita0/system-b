import { z } from 'zod'

export const consumptionRuleSchema = z.object({
  productId: z.number().int().positive(),
  saleFormatId: z.number().int().positive().nullable().optional(),
  consumeQuantity: z.number().positive(),
  unit: z.string().trim().min(1).max(20).optional().default('ml'),
})

export const consumptionRuleUpdateSchema = consumptionRuleSchema.extend({
  id: z.number().int().positive(),
})

