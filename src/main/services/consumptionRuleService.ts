import { ZodError } from 'zod'
import type { CategoryTreeNode } from '../../shared/types/product'
import {
  consumptionRuleSchema,
  consumptionRuleUpdateSchema,
  syncProductConsumptionRulesSchema,
} from '../../shared/schemas/consumptionRuleSchema'
import { ValidationError } from '../errors'
import { getDb } from '../database/connection'
import { ConsumptionRuleRepository } from '../repositories/consumptionRuleRepository'
import { ProductRepository } from '../repositories/productRepository'
import { CategoryService } from './categoryService'

function normalizeZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}

function findCategoryNode(nodes: CategoryTreeNode[], id: number): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    const found = findCategoryNode(node.children, id)
    if (found) {
      return found
    }
  }
  return null
}

export class ConsumptionRuleService {
  constructor(
    private readonly repository: ConsumptionRuleRepository,
    private readonly products: ProductRepository,
    private readonly categories: CategoryService,
  ) {}

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

  syncProductRules(payload: unknown) {
    const parsed = syncProductConsumptionRulesSchema.safeParse(payload)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const { productId, rows } = parsed.data
    const product = this.products.getById(productId)
    if (!product) {
      throw new ValidationError('Producto no encontrado.')
    }

    const tree = this.categories.listTree()
    const node = findCategoryNode(tree, product.categoryId)
    if (!node) {
      throw new ValidationError('Categoria del producto no encontrada.')
    }

    const allowed = new Set(node.effectiveSaleFormatIds)
    const seen = new Set<number>()
    for (const row of rows) {
      if (seen.has(row.saleFormatId)) {
        throw new ValidationError('Hay formatos duplicados en la solicitud.')
      }
      seen.add(row.saleFormatId)
      if (!allowed.has(row.saleFormatId)) {
        throw new ValidationError('Uno o mas formatos no aplican a la categoria de este producto.')
      }
    }

    const db = getDb()
    db.transaction(() => {
      for (const row of rows) {
        const consume = row.consumeQuantity
        if (consume == null || consume <= 0) {
          this.repository.deleteByProductAndSaleFormat(productId, row.saleFormatId)
        } else {
          const basePrice = row.basePrice ?? null
          this.repository.upsertProductFormatRule(productId, row.saleFormatId, consume, 'ml', basePrice)
        }
      }
    })()

    return { success: true as const }
  }
}
