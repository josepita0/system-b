import { ZodError } from 'zod'
import type { Product } from '../../shared/types/product'
import type { PagedResult } from '../../shared/types/pagination'
import type { ProductInput, ProductUpdateInput } from '../../shared/types/product'
import { offsetForPage } from '../../shared/schemas/paginationSchema'
import { productSchema, productUpdateSchema } from '../../shared/schemas/productSchema'
import { ConflictError, NotFoundError, ValidationError } from '../errors'
import { CategoryRepository } from '../repositories/categoryRepository'
import { ProductRepository } from '../repositories/productRepository'
import type { CatalogMediaService } from './catalogMediaService'

function normalizeZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}

export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly catalogMedia: CatalogMediaService,
  ) {}

  list(categoryId?: number) {
    if (typeof categoryId === 'number') {
      const category = this.categories.getById(categoryId)
      if (!category || !category.isActive) {
        throw new NotFoundError('Categoria no encontrada.')
      }
    }

    return this.repository.list(categoryId)
  }

  listPaged(categoryId: number | undefined, search: string | undefined, page: number, pageSize: number): PagedResult<Product> {
    if (typeof categoryId === 'number') {
      const category = this.categories.getById(categoryId)
      if (!category || !category.isActive) {
        throw new NotFoundError('Categoria no encontrada.')
      }
    }

    const total = this.repository.countListPaged(categoryId, search)
    const offset = offsetForPage(page, pageSize)
    const items = this.repository.listPaged(categoryId, search, pageSize, offset)
    return { items, total, page, pageSize }
  }

  listProgressivePaged(search: string | undefined, page: number, pageSize: number): PagedResult<Product> {
    const total = this.repository.countProgressivePaged(search)
    const offset = offsetForPage(page, pageSize)
    const items = this.repository.listProgressivePaged(search, pageSize, offset)
    return { items, total, page, pageSize }
  }

  getById(id: number) {
    return this.repository.getById(id)
  }

  create(input: ProductInput) {
    const parsed = productSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const category = this.categories.getById(parsed.data.categoryId)
    if (!category || !category.isActive) {
      throw new ValidationError('Debe seleccionar una categoria activa.')
    }

    if (this.repository.getBySku(parsed.data.sku)) {
      throw new ConflictError('Ya existe otro producto con el mismo nombre.')
    }

    const created = this.repository.create(parsed.data)
    this.categories.lockStructure(parsed.data.categoryId)
    return created
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
      throw new ConflictError('Ya existe otro producto con el mismo nombre.')
    }

    const category = this.categories.getById(parsed.data.categoryId)
    if (!category || !category.isActive) {
      throw new ValidationError('Debe seleccionar una categoria activa.')
    }

    const updated = this.repository.update(parsed.data)
    this.categories.lockStructure(parsed.data.categoryId)
    return updated
  }

  remove(id: number) {
    const existing = this.repository.getById(id)
    if (!existing) {
      throw new NotFoundError('Producto no encontrado.')
    }

    this.catalogMedia.purgeProductFiles(id)
    this.repository.softDelete(id)
    return { success: true as const }
  }
}
