import type { BomItem, BomStockVirtualRow, BomUpsertInput } from '../../shared/types/bom'
import { bomUpsertSchema } from '../../shared/schemas/bomSchema'
import { StockError, ValidationError } from '../errors'
import { BomRepository } from '../repositories/bomRepository'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'

export class BomService {
  constructor(
    private readonly boms: BomRepository,
    private readonly inventory: ProductInventoryRepository,
  ) {}

  getItems(parentProductId: number): BomItem[] {
    if (!Number.isFinite(parentProductId) || parentProductId <= 0) {
      throw new ValidationError('Producto inválido.')
    }
    const rows = this.boms.listItems(parentProductId)
    return rows.map((r) => ({
      id: r.id,
      parentProductId: r.parent_product_id,
      componentProductId: r.component_product_id,
      componentSku: r.component_sku,
      componentName: r.component_name,
      quantityPerUnit: Number(r.quantity_per_unit),
    }))
  }

  upsert(input: BomUpsertInput) {
    const parsed = bomUpsertSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '))
    }
    if (parsed.data.items.length === 0) {
      this.boms.removeAll(parsed.data.parentProductId)
      return
    }

    const seen = new Set<number>()
    for (const it of parsed.data.items) {
      if (it.componentProductId === parsed.data.parentProductId) {
        throw new ValidationError('Un producto no puede depender de sí mismo.')
      }
      if (seen.has(it.componentProductId)) {
        throw new ValidationError('Componentes duplicados en el BOM.')
      }
      seen.add(it.componentProductId)
      if (!this.inventory.productExists(it.componentProductId)) {
        throw new ValidationError('Componente no encontrado.')
      }
      if (this.inventory.isProgressiveProduct(it.componentProductId)) {
        throw new ValidationError('No se admite componente con consumo progresivo en BOM (por ahora).')
      }
    }

    this.boms.replaceAll(
      parsed.data.parentProductId,
      parsed.data.items.map((i) => ({
        componentProductId: i.componentProductId,
        quantityPerUnit: i.quantityPerUnit,
      })),
    )
  }

  removeAll(parentProductId: number) {
    if (!Number.isFinite(parentProductId) || parentProductId <= 0) {
      throw new ValidationError('Producto inválido.')
    }
    this.boms.removeAll(parentProductId)
  }

  getVirtualStock(parentProductId: number): BomStockVirtualRow {
    const items = this.getItems(parentProductId)
    if (items.length === 0) {
      return { parentProductId, availableUnits: 0, limitingComponentProductId: null }
    }

    let minUnits = Number.POSITIVE_INFINITY
    let limiting: number | null = null
    for (const it of items) {
      const stock = this.inventory.getStockByProductId(it.componentProductId)
      const possible = stock / it.quantityPerUnit
      if (!Number.isFinite(possible)) {
        continue
      }
      if (possible < minUnits) {
        minUnits = possible
        limiting = it.componentProductId
      }
    }
    if (!Number.isFinite(minUnits) || minUnits === Number.POSITIVE_INFINITY) {
      return { parentProductId, availableUnits: 0, limitingComponentProductId: limiting }
    }
    return { parentProductId, availableUnits: Math.max(0, Math.floor(minUnits * 1000) / 1000), limitingComponentProductId: limiting }
  }

  /**
   * Expande un consumo del producto parent a consumos de componentes.
   * Devuelve pares {componentProductId, quantityToExit}.
   */
  expandToComponents(parentProductId: number, quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ValidationError('Cantidad inválida.')
    }
    const items = this.getItems(parentProductId)
    if (items.length === 0) {
      throw new ValidationError('El producto no tiene BOM configurado.')
    }

    return items.map((it) => ({
      componentProductId: it.componentProductId,
      quantityToExit: quantity * it.quantityPerUnit,
    }))
  }

  validateComponentStock(exits: Array<{ componentProductId: number; quantityToExit: number }>) {
    for (const ex of exits) {
      const stock = this.inventory.getStockByProductId(ex.componentProductId)
      if (stock - ex.quantityToExit < -0.0001) {
        throw new StockError('Stock insuficiente de componentes para completar la venta.')
      }
    }
  }
}

