import { ZodError } from 'zod'
import type { CategoryTreeNode } from '../../shared/types/product'
import type {
  CreateSaleInput,
  CustomerTabSummary,
  OpenTabInput,
  OpenTabResult,
  PosCatalogResponse,
  RemoveTabChargeLineInput,
  SaleCreated,
  SettleTabInput,
  TabChargeDetail,
  TabSettlementResult,
} from '../../shared/types/sale'
import {
  createSaleSchema,
  openTabSchema,
  removeTabChargeLineSchema,
  settleTabSchema,
} from '../../shared/schemas/saleSchema'
import { ShiftStateError, StockError, ValidationError } from '../errors'
import { CategoryRepository } from '../repositories/categoryRepository'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { ProductRepository } from '../repositories/productRepository'
import { RecipeRepository } from '../repositories/recipeRepository'
import type { SaleLineInsert } from '../repositories/saleRepository'
import { SaleRepository } from '../repositories/saleRepository'
import { TabRepository } from '../repositories/tabRepository'
import { SaleFormatRepository } from '../repositories/saleFormatRepository'
import { ShiftRepository } from '../repositories/shiftRepository'
import { CategoryService } from './categoryService'
import { VipCustomerRepository } from '../repositories/vipCustomerRepository'
import { SaleFormatConsumptionRepository } from '../repositories/saleFormatConsumptionRepository'

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
    private readonly inventory: ProductInventoryRepository,
    private readonly tabs: TabRepository,
    private readonly vipCustomers: VipCustomerRepository,
    private readonly consumptions: SaleFormatConsumptionRepository,
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
  openTab(input: OpenTabInput, employeeId: number): OpenTabResult {
    const parsed = openTabSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const session = this.shifts.getCurrentSession()
    if (!session) {
      throw new ShiftStateError('No hay turno de caja abierto.')
    }

    const id = this.tabs.create(parsed.data.customerName, session.id, employeeId)
    const row = this.tabs.getById(id)
    if (!row) {
      throw new ValidationError('No se pudo crear la cuenta.')
    }

    return {
      id: row.id,
      customerName: row.customerName,
      openedAt: row.openedAt,
    }
  }

  listOpenTabs(): CustomerTabSummary[] {
    return this.tabs.listOpenWithBalances()
  }

  settleTab(input: SettleTabInput, employeeId: number): TabSettlementResult {
    const parsed = settleTabSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const session = this.shifts.getCurrentSession()
    if (!session) {
      throw new ShiftStateError('No hay turno de caja abierto.')
    }

    const tab = this.tabs.getById(parsed.data.tabId)
    if (!tab || tab.status !== 'open') {
      throw new ValidationError('La cuenta no existe o ya fue liquidada.')
    }

    const total = roundMoney(this.tabs.getTabChargeTotal(parsed.data.tabId))
    if (total <= 0) {
      const closed = this.tabs.markTabSettledWithoutPayment(parsed.data.tabId, session.id)
      return {
        saleId: null,
        total: 0,
        cashSessionId: session.id,
        createdAt: closed.createdAt,
      }
    }

    const created = this.sales.settleTabWithPayment(session.id, employeeId, total, parsed.data.tabId)

    return {
      saleId: created.id,
      total: created.total,
      cashSessionId: created.cashSessionId,
      createdAt: created.createdAt,
    }
  }

  getTabChargeDetail(tabId: number): TabChargeDetail {
    const tab = this.tabs.getById(tabId)
    if (!tab || tab.status !== 'open') {
      throw new ValidationError('La cuenta no existe o ya fue liquidada.')
    }
    const detail = this.tabs.getTabChargeDetail(tabId)
    if (!detail) {
      throw new ValidationError('No se pudo cargar el detalle de la cuenta.')
    }
    return detail
  }

  removeTabChargeLine(input: RemoveTabChargeLineInput): { tabId: number; newBalance: number } {
    const parsed = removeTabChargeLineSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }
    return this.sales.removeTabChargeSaleItem(parsed.data.saleItemId, this.consumptions)
  }

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

    if (parsed.data.tabId != null) {
      const tab = this.tabs.getById(parsed.data.tabId)
      if (!tab || tab.status !== 'open') {
        throw new ValidationError('La cuenta no existe o ya fue liquidada.')
      }
    }

    const vipCustomerId = parsed.data.vipCustomerId ?? null
    const vip = vipCustomerId != null ? this.vipCustomers.getById(vipCustomerId) : null
    if (vipCustomerId != null && (!vip || vip.isActive !== 1)) {
      throw new ValidationError('Cliente VIP no disponible.')
    }
    if (vip?.conditionType === 'exempt' && parsed.data.tabId != null) {
      throw new ValidationError('No se permite exoneracion VIP en ventas a cuenta.')
    }

    const tree = this.categoryService.listTree()
    const lines: SaleLineInsert[] = []
    const inventoryAccum = new Map<number, number>()
    const progressiveToConsume = new Map<number, number>()

    const resolveDefaultUnitPrice = (productId: number, saleFormatId: number | null): number | null => {
      const specific = this.consumptions.listForProductAndFormat(productId, saleFormatId)
      const fallback =
        specific.length === 0 && saleFormatId != null ? this.consumptions.listForProductAndFormat(productId, null) : specific
      const row = fallback.length ? fallback[0] : null
      const basePrice = row?.basePrice ?? null
      return basePrice != null ? Number(basePrice) : null
    }

    const accumulateInventory = (productId: number, saleFormatId: number | null, quantity: number) => {
      const product = this.products.getById(productId)
      if (!product || !product.isActive) {
        throw new ValidationError('Producto no disponible.')
      }
      if (product.type !== 'simple') {
        return
      }

      // Consumo unitario (default): descuenta unidades completas.
      const prev = inventoryAccum.get(product.id) ?? 0
      inventoryAccum.set(product.id, prev - quantity)

      // Consumo progresivo: si hay regla por formato, consume ml del mismo producto.
      if (!this.inventory.isProgressiveProduct(product.id)) {
        return
      }
      const consumptionRows = this.consumptions.listForProductAndFormat(product.id, saleFormatId)
      const fallbackRows =
        consumptionRows.length === 0 && saleFormatId != null ? this.consumptions.listForProductAndFormat(product.id, null) : consumptionRows
      if (fallbackRows.length) {
        const c = fallbackRows[0]
        if (c.unit !== 'ml') {
          throw new ValidationError('Unidad de consumo no soportada (solo ml).')
        }
        const amount = quantity * c.consumeQuantity
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new ValidationError('Cantidad de consumo inválida.')
        }
        const prevProg = progressiveToConsume.get(product.id) ?? 0
        progressiveToConsume.set(product.id, prevProg + amount)
      }
    }

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
      let complementProduct: ReturnType<ProductRepository['getById']> | null = null
      if (format?.requiresComplement === 1) {
        if (complementProductId == null) {
          throw new ValidationError('Este formato requiere un complemento.')
        }
        complementProduct = this.products.getById(complementProductId)
        if (!complementProduct || !complementProduct.isActive) {
          throw new ValidationError('Producto complemento no disponible.')
        }
        const rootId = format.complementCategoryRootId
        if (rootId == null) {
          throw new ValidationError('Formato sin categoria de complemento configurada.')
        }
        if (!this.categories.isCategoryInSubtree(complementProduct.categoryId, rootId)) {
          throw new ValidationError('El complemento no pertenece a la categoria permitida.')
        }
      } else {
        complementProductId = null
        if (rawLine.complementProductId != null) {
          throw new ValidationError('Este formato no admite complemento.')
        }
      }

      const defaultFromRule = resolveDefaultUnitPrice(product.id, saleFormatId)
      const complementPrice = complementProduct ? complementProduct.salePrice : 0
      const catalogUnitPrice = (defaultFromRule != null ? defaultFromRule : product.salePrice) + complementPrice
      const chargedUnitPrice =
        rawLine.chargedUnitPrice !== undefined && rawLine.chargedUnitPrice !== null
          ? rawLine.chargedUnitPrice
          : catalogUnitPrice
      const priceDiffers = Math.abs(chargedUnitPrice - catalogUnitPrice) > 0.000_001
      if (priceDiffers && !vip) {
        const note = rawLine.priceChangeNote?.trim() ?? ''
        if (note.length === 0) {
          throw new ValidationError('Indique el motivo del cambio de precio en la linea.')
        }
      }

      const discount = rawLine.discount ?? 0
      const lineTotal = chargedUnitPrice * rawLine.quantity - discount
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
        unitPrice: chargedUnitPrice,
        realUnitPrice: catalogUnitPrice,
        chargedUnitPrice,
        discount,
        quantity: rawLine.quantity,
        subtotal,
        saleFormatId,
        complementProductId,
        priceChangeNote: priceDiffers ? (rawLine.priceChangeNote?.trim() || null) : null,
      })

      accumulateInventory(product.id, saleFormatId, rawLine.quantity)

      if (format?.requiresComplement === 1 && complementProductId != null && complementProduct) {
        // El complemento no genera una línea aparte; solo descuenta inventario como producto unitario.
        const prev = inventoryAccum.get(complementProduct.id) ?? 0
        inventoryAccum.set(complementProduct.id, prev - rawLine.quantity)
      }
    }

    const total = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0))
    const realTotal = total
    let chargedTotal = total
    let vipConditionSnapshot: string | null = null

    if (vip) {
      if (vip.conditionType === 'exempt') {
        chargedTotal = 0
        vipConditionSnapshot = JSON.stringify({ conditionType: 'exempt' })
      } else if (vip.conditionType === 'discount_manual') {
        const override = parsed.data.chargedTotal
        if (override == null) {
          throw new ValidationError('Indique el monto a cobrar para el cliente VIP.')
        }
        if (override > realTotal + 0.0001) {
          throw new ValidationError('El monto a cobrar no puede exceder el total real.')
        }
        chargedTotal = roundMoney(override)
        vipConditionSnapshot = JSON.stringify({ conditionType: 'discount_manual', chargedTotal })
      }
    }

    const inventoryExits = [...inventoryAccum.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }))

    for (const exit of inventoryExits) {
      // Consumo progresivo: la disponibilidad real la valida consumeProgressive (ml en lotes), no la suma de movimientos ni el conteo de lotes.
      if (this.inventory.isProgressiveProduct(exit.productId)) {
        continue
      }
      const stock = this.inventory.getStockByProductId(exit.productId)
      if (stock + exit.quantity < -0.0001) {
        throw new StockError('Stock insuficiente de productos para completar la venta.')
      }
    }

    const saleType = parsed.data.tabId != null ? 'tab_charge' : 'pos'
    const tabId = parsed.data.tabId ?? null

    return this.sales.createSaleWithItems(
      session.id,
      employeeId,
      chargedTotal,
      realTotal,
      lines,
      inventoryExits,
      saleType,
      tabId,
      vipCustomerId,
      vipConditionSnapshot,
      [...progressiveToConsume.entries()].map(([productId, amount]) => ({ productId, amount })),
    )
  }
}
