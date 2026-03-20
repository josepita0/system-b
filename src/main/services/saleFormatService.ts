import { ZodError } from 'zod'
import type { SaleFormatInput, SaleFormatUpdateInput } from '../../shared/types/product'
import { saleFormatSchema, saleFormatUpdateSchema } from '../../shared/schemas/productSchema'
import { ConflictError, NotFoundError, ValidationError } from '../errors'
import { CategoryRepository } from '../repositories/categoryRepository'
import { SaleFormatRepository } from '../repositories/saleFormatRepository'

function normalizeZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}

export class SaleFormatService {
  constructor(
    private readonly saleFormats: SaleFormatRepository,
    private readonly categories: CategoryRepository,
  ) {}

  list() {
    return this.saleFormats.list()
  }

  create(input: SaleFormatInput) {
    const parsed = saleFormatSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    this.ensureCodeAvailable(parsed.data.code)
    this.ensureComplementRootIsValid(parsed.data.complementCategoryRootId ?? null)
    return this.saleFormats.create(parsed.data)
  }

  update(input: SaleFormatUpdateInput) {
    const parsed = saleFormatUpdateSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const existing = this.saleFormats.getById(parsed.data.id)
    if (!existing || !existing.isActive) {
      throw new NotFoundError('Formato de venta no encontrado.')
    }

    this.ensureCodeAvailable(parsed.data.code, parsed.data.id)
    this.ensureComplementRootIsValid(parsed.data.complementCategoryRootId ?? null)
    return this.saleFormats.update(parsed.data)
  }

  remove(id: number) {
    const existing = this.saleFormats.getById(id)
    if (!existing || !existing.isActive) {
      throw new NotFoundError('Formato de venta no encontrado.')
    }

    this.saleFormats.softDelete(id)
    return { success: true as const }
  }

  private ensureCodeAvailable(code: string, currentId?: number) {
    const existing = this.saleFormats.getByCode(code)
    if (existing && existing.id !== currentId) {
      throw new ConflictError('El codigo del formato ya existe.')
    }
  }

  private ensureComplementRootIsValid(categoryId: number | null) {
    if (!categoryId) {
      return
    }

    const category = this.categories.getById(categoryId)
    if (!category || !category.isActive) {
      throw new ValidationError('La categoria raiz de complemento no existe o esta inactiva.')
    }

    if (category.parentId !== null) {
      throw new ValidationError('La categoria de complemento debe ser una categoria raiz.')
    }
  }
}
