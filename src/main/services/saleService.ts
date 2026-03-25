import { ZodError } from 'zod'
import type { CategoryTreeNode } from '../../shared/types/product'
import type { CreateSaleInput, PosCatalogResponse, SaleCreated } from '../../shared/types/sale'
import { createSaleSchema } from '../../shared/schemas/saleSchema'
import { ShiftStateError, StockError, ValidationError } from '../errors'
import { CategoryRepository } from '../repositories/categoryRepository'
import { InventoryRepository } from '../repositories/inventoryRepository'
import { ProductRepository } from '../repositories/productRepository'
import { RecipeRepository } from '../repositories/recipeRepository'
import type { SaleLineInsert } from '../repositories/saleRepository'
import { SaleRepository } from '../repositories/saleRepository'
import { SaleFormatRepository } from '../repositories/saleFormatRepository'
import { ShiftRepository } from '../repositories/shiftRepository'
import { CategoryService } from './categoryService'

function normalizeZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function findCategoryNode(nodes: CategoryTreeNode[], id: number): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    const child = findCategoryNode(node.children, id)
    if (child) {
      return child
    }
  }
  return null
}

export class SaleService {
  constructor(
    private readonly shifts: ShiftRepository,
    private readonly products: ProductRepository,
    private readonly saleFormats: SaleFormatRepository,
    private readonly categories: CategoryRepository,
    private readonly categoryService: CategoryService,
    private readonly sales: SaleRepository,
    private readonly recipes: RecipeRepository,
    private readonly inventory: InventoryRepository,
  ) {}

  getPosCatalog(): PosCatalogResponse {
    const categoryTree = this.categoryService.listTree()
    const idSet = new Set<number>()
    const collect = (nodes: CategoryTreeNode[]) => {
      for (const node of nodes) {
        for (const formatId of node.effectiveSaleFormatIds) {
          idSet.add(formatId)
        }
        collect(node.children)
      }
    }
    collect(categoryTree)

    const saleFormats = [...idSet]
      .sort((a, b) => a - b)
      .map((id) => this.saleFormats.getById(id))
      .filter((format): format is NonNullable<typeof format> => Boolean(format && format.isActive === 1))

    return { categoryTree, saleFormats }
  }

  listPosProducts(categoryId: number) {
    return this.products.list(categoryId)
  }

  /** Productos activos en una categoria raiz y sus descendientes (p. ej. complementos de un combinado). */
  listPosComplementProducts(rootCategoryId: number) {
    const root = this.categories.getById(rootCategoryId)
    if (!root || !root.isActive) {
      throw new ValidationError('Categoria de complementos no disponible.')
    }
    const descendantIds = this.categories.getDescendantIds(rootCategoryId)
    const categoryIds = [rootCategoryId, ...descendantIds]
    return this.products.listInCategories(categoryIds)
  }

  createSale(input: CreateSaleInput, employeeId: number): SaleCreated {
    const parsed = createSaleSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const session = this.shifts.getCurrentSession()
    if (!session) {
      throw new ShiftStateError('No hay turno de caja abierto.')
    }

    const tree = this.categoryService.listTree()
    const lines: SaleLineInsert[] = []
    const inventoryAccum = new Map<number, number>()

    for (const rawLine of parsed.data.items) {
      const product = this.products.getById(rawLine.productId)
      if (!product || !product.isActive) {
        throw new ValidationError('Producto no disponible.')
      }

      const categoryNode = findCategoryNode(tree, product.categoryId)
      if (!categoryNode) {
        throw new ValidationError('Categoria del producto no encontrada.')
      }

      const effectiveIds = [...categoryNode.effectiveSaleFormatIds].sort((a, b) => a - b)
      let saleFormatId: number | null = rawLine.saleFormatId ?? null

      if (effectiveIds.length === 0) {
        saleFormatId = null
        if (rawLine.saleFormatId != null) {
          throw new ValidationError('Este producto no requiere formato de venta.')
        }
      } else if (effectiveIds.length === 1) {
        saleFormatId = effectiveIds[0]
        if (rawLine.saleFormatId != null && rawLine.saleFormatId !== effectiveIds[0]) {
          throw new ValidationError('Formato de venta no permitido para esta categoria.')
        }
      } else if (saleFormatId == null) {
        throw new ValidationError('Seleccione un formato de venta.')
      } else if (!effectiveIds.includes(saleFormatId)) {
        throw new ValidationError('Formato de venta no permitido para esta categoria.')
      }

      const format = saleFormatId ? this.saleFormats.getById(saleFormatId) : null
      if (saleFormatId && (!format || format.isActive !== 1)) {
        throw new ValidationError('Formato de venta no disponible.')
      }

      let complementProductId: number | null = rawLine.complementProductId ?? null
      if (format?.requiresComplement === 1) {
        if (complementProductId == null) {
          throw new ValidationError('Este formato requiere un complemento.')
        }
        const complement = this.products.getById(complementProductId)
        if (!complement || !complement.isActive) {
          throw new ValidationError('Producto complemento no disponible.')
        }
        const rootId = format.complementCategoryRootId
        if (rootId == null) {
          throw new ValidationError('Formato sin categoria de complemento configurada.')
        }
        if (!this.categories.isCategoryInSubtree(complement.categoryId, rootId)) {
          throw new ValidationError('El complemento no pertenece a la categoria permitida.')
        }
      } else {
        complementProductId = null
        if (rawLine.complementProductId != null) {
          throw new ValidationError('Este formato no admite complemento.')
        }
      }

      const unitPrice = product.salePrice
      const discount = rawLine.discount ?? 0
      const lineTotal = unitPrice * rawLine.quantity - discount
      if (lineTotal < 0) {
        throw new ValidationError('Descuento demasiado alto para una linea.')
      }
      const subtotal = roundMoney(lineTotal)

      let productName = product.name
      if (format) {
        productName = `${product.name} — ${format.name}`
        if (complementProductId) {
          const comp = this.products.getById(complementProductId)
          if (comp) {
            productName = `${productName} + ${comp.name}`
          }
        }
      }

      lines.push({
        productId: product.id,
        productName,
        unitPrice,
        discount,
        quantity: rawLine.quantity,
        subtotal,
        saleFormatId,
        complementProductId,
      })

      if (product.type === 'compound') {
        const recipe = this.recipes.getByProductId(product.id)
        if (recipe && recipe.items.length > 0) {
          const factor = rawLine.quantity / recipe.yieldQuantity
          for (const item of recipe.items) {
            const prev = inventoryAccum.get(item.ingredientId) ?? 0
            inventoryAccum.set(item.ingredientId, prev - factor * item.quantity)
          }
        }
      }
    }

    const total = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0))

    const inventoryExits = [...inventoryAccum.entries()].map(([ingredientId, quantity]) => ({
      ingredientId,
      quantity,
    }))

    for (const exit of inventoryExits) {
      const stock = this.inventory.getStockByIngredientId(exit.ingredientId)
      if (stock + exit.quantity < -0.0001) {
        throw new StockError('Stock insuficiente de ingredientes para completar la venta.')
      }
    }

    return this.sales.createSaleWithItems(session.id, employeeId, total, lines, inventoryExits)
  }
}
