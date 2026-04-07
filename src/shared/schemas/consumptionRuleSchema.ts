import { z } from 'zod'

export const consumptionRuleSchema = z.object({
  productId: z.number().int().positive(),
  saleFormatId: z.number().int().positive().nullable().optional(),
  consumeQuantity: z.number().positive(),
  unit: z.string().trim().min(1).max(20).optional().default('ml'),
  basePrice: z.number().nonnegative().nullable().optional(),
})

export const consumptionRuleUpdateSchema = consumptionRuleSchema.extend({
  id: z.number().int().positive(),
})

export const syncProductConsumptionRulesSchema = z.object({
  productId: z.number().int().positive(),
  rows: z.array(
    z.object({
      saleFormatId: z.number().int().positive(),
      consumeQuantity: z.number().positive().nullable(),
      basePrice: z.number().nonnegative().nullable().optional(),
    }),
  ),
})

