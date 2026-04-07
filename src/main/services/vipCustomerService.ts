import { ZodError } from 'zod'
import type { PagedResult } from '../../shared/types/pagination'
import type { VipCustomer, VipCustomerInput } from '../../shared/types/vipCustomer'
import { offsetForPage } from '../../shared/schemas/paginationSchema'
import { vipCustomerSchema, vipCustomerUpdateSchema } from '../../shared/schemas/vipCustomerSchema'
import { ValidationError } from '../errors'
import { VipCustomerRepository } from '../repositories/vipCustomerRepository'

function normalizeZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}

export class VipCustomerService {
  constructor(private readonly repository: VipCustomerRepository) {}

  list() {
    return this.repository.list()
  }

  listPaged(page: number, pageSize: number): PagedResult<VipCustomer> {
    const total = this.repository.countActive()
    const offset = offsetForPage(page, pageSize)
    const items = this.repository.listPaged(pageSize, offset)
    return { items, total, page, pageSize }
  }

  getById(id: number) {
    const row = this.repository.getById(id)
    if (!row) {
      throw new ValidationError('Cliente VIP no encontrado.')
    }
    return row
  }

  create(payload: unknown) {
    const parsed = vipCustomerSchema.safeParse(payload)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }
    return this.repository.create(parsed.data as VipCustomerInput)
  }

  update(payload: unknown) {
    const parsed = vipCustomerUpdateSchema.safeParse(payload)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }
    return this.repository.update(parsed.data.id, parsed.data)
  }

  remove(id: number) {
    this.repository.softDelete(id)
  }
}

