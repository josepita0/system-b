import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { ProductLotRepository } from '../repositories/productLotRepository'
import { ValidationError } from '../errors'
import type { InventoryMovementInput } from '../../shared/types/inventory'
import type { IngredientProgressiveConfigInput, InventoryLotCreateInput } from '../../shared/types/inventoryProgressive'

export class InventoryService {
  constructor(
    private readonly repository: ProductInventoryRepository,
    private readonly lots: ProductLotRepository,
  ) {}

  getInventorySnapshot() {
    return this.repository.listBalance()
  }

  getReplenishmentList() {
    // Se mantiene solo para compatibilidad; la pantalla usa listBalance().
    return []
  }

  listBalance() {
    return this.repository.listBalance()
  }

  postOpening(payload: InventoryMovementInput) {
    this.ensureProduct(payload.productId)
    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      throw new ValidationError('Cantidad inválida.')
    }
    this.repository.insertMovement({
      productId: payload.productId,
      movementType: 'entry',
      quantity: payload.quantity,
      referenceType: 'inventory_opening',
      note: payload.note ?? null,
    })
  }

  postEntry(payload: InventoryMovementInput) {
    this.ensureProduct(payload.productId)
    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      throw new ValidationError('Cantidad inválida.')
    }
    this.repository.insertMovement({
      productId: payload.productId,
      movementType: 'entry',
      quantity: payload.quantity,
      referenceType: 'inventory_entry_manual',
      note: payload.note ?? null,
    })
  }

  postAdjustment(payload: InventoryMovementInput) {
    this.ensureProduct(payload.productId)
    if (!Number.isFinite(payload.quantity) || payload.quantity === 0) {
      throw new ValidationError('Cantidad inválida.')
    }
    this.repository.insertMovement({
      productId: payload.productId,
      movementType: 'adjustment',
      quantity: payload.quantity,
      referenceType: 'inventory_adjustment',
      note: payload.note ?? null,
    })
  }

  private ensureProduct(id: number) {
    if (!Number.isFinite(id) || id <= 0) {
      throw new ValidationError('Producto inválido.')
    }
    if (!this.repository.productExists(id)) {
      throw new ValidationError('Producto no encontrado.')
    }
  }

  listLots(productId: number) {
    return this.lots.listLots(productId)
  }

  updateIngredientProgressiveConfig(payload: IngredientProgressiveConfigInput) {
    this.lots.updateProductProgressiveConfig({
      productId: payload.productId,
      consumptionMode: payload.consumptionMode,
      capacityQuantity: payload.capacityQuantity ?? null,
      capacityUnit: payload.capacityUnit ?? null,
    })
  }

  createLots(payload: InventoryLotCreateInput) {
    if (!Number.isFinite(payload.productId) || payload.productId <= 0) {
      throw new ValidationError('Producto inválido.')
    }
    const totalAdded = this.lots.createSealedLots(payload.productId, payload.units)
    this.repository.insertMovement({
      productId: payload.productId,
      movementType: 'entry',
      quantity: totalAdded,
      referenceType: 'product_lots_entry',
      note: payload.note ?? null,
    })
  }
}
