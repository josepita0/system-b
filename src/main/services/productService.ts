import { ZodError } from 'zod'
import type { ProductInput, ProductUpdateInput } from '../../shared/types/product'
import { productSchema, productUpdateSchema } from '../../shared/schemas/productSchema'
import { ConflictError, NotFoundError, ValidationError } from '../errors'
import { ProductRepository } from '../repositories/productRepository'

function normalizeZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  list() {
    return this.repository.list()
  }

  getById(id: number) {
    return this.repository.getById(id)
  }

  create(input: ProductInput) {
    const parsed = productSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    if (this.repository.getBySku(parsed.data.sku)) {
      throw new ConflictError('El SKU ya existe.')
    }

    return this.repository.create(parsed.data)
  }

  update(input: ProductUpdateInput) {
    const parsed = productUpdateSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const existing = this.repository.getById(parsed.data.id)
    if (!existing) {
      throw new NotFoundError('Producto no encontrado.')
    }

    const skuOwner = this.repository.getBySku(parsed.data.sku)
    if (skuOwner && skuOwner.id !== parsed.data.id) {
      throw new ConflictError('El SKU ya existe.')
    }

    return this.repository.update(parsed.data)
  }

  remove(id: number) {
    const existing = this.repository.getById(id)
    if (!existing) {
      throw new NotFoundError('Producto no encontrado.')
    }

    this.repository.softDelete(id)
    return { success: true as const }
  }
}
