import { ZodError } from 'zod'
import { consumptionRuleSchema, consumptionRuleUpdateSchema } from '../../shared/schemas/consumptionRuleSchema'
import { ValidationError } from '../errors'
import { ConsumptionRuleRepository } from '../repositories/consumptionRuleRepository'

function normalizeZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}

export class ConsumptionRuleService {
  constructor(private readonly repository: ConsumptionRuleRepository) {}

  list() {
    return this.repository.list()
  }

  create(payload: unknown) {
    const parsed = consumptionRuleSchema.safeParse(payload)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }
    return this.repository.create(parsed.data)
  }

  update(payload: unknown) {
    const parsed = consumptionRuleUpdateSchema.safeParse(payload)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }
    return this.repository.update(parsed.data.id, parsed.data)
  }

  remove(id: number) {
    this.repository.remove(id)
  }
}

