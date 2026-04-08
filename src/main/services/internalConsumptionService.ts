import type {
  CancelInternalConsumptionInput,
  CreateInternalConsumptionInput,
  InternalConsumption,
  InternalConsumptionListItem,
} from '../../shared/types/internalConsumption'
import { cancelInternalConsumptionSchema, createInternalConsumptionSchema } from '../../shared/schemas/internalConsumptionSchema'
import { offsetForPage, parsePageParams } from '../../shared/schemas/paginationSchema'
import { ConflictError, StockError, ValidationError } from '../errors'
import { InternalConsumptionRepository } from '../repositories/internalConsumptionRepository'
import { ProductInventoryRepository } from '../repositories/productInventoryRepository'
import { ShiftRepository } from '../repositories/shiftRepository'

function roundQty(value: number) {
  return Math.round(value * 1000) / 1000
}

export class InternalConsumptionService {
  constructor(
    private readonly shifts: ShiftRepository,
    private readonly docs: InternalConsumptionRepository,
    private readonly inventory: ProductInventoryRepository,
  ) {}

  create(input: CreateInternalConsumptionInput, actorEmployeeId: number) {
    const parsed = createInternalConsumptionSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '))
    }

    const reason = parsed.data.reason.trim()
    const attach = parsed.data.attachToCurrentCashSession !== false

    const session = attach ? this.shifts.getCurrentSession() : null
    const cashSessionId = session?.id ?? null

    const accum = new Map<number, { qty: number; note: string | null }>()
    for (const line of parsed.data.items) {
      if (!this.inventory.productExists(line.productId)) {
        throw new ValidationError('Producto no encontrado.')
      }
      const q = Number(line.quantity)
      if (!Number.isFinite(q) || q <= 0) {
        throw new ValidationError('Cantidad inválida.')
      }
      const prev = accum.get(line.productId)
      if (prev) {
        prev.qty += q
      } else {
        accum.set(line.productId, { qty: q, note: line.note ?? null })
      }
    }

    for (const [productId, item] of accum.entries()) {
      const stock = this.inventory.getStockByProductId(productId)
      const after = stock - item.qty
      if (after < -0.0001) {
        throw new StockError('Stock insuficiente para registrar el consumo interno.')
      }
    }

    const items = [...accum.entries()].map(([productId, it]) => ({
      productId,
      quantity: roundQty(it.qty),
      note: it.note,
    }))

    const id = this.docs.create({
      cashSessionId,
      createdByEmployeeId: actorEmployeeId,
      reason,
      items,
    })

    for (const it of items) {
      const note = [reason, it.note].filter(Boolean).join(' · ')
      this.inventory.insertMovement({
        productId: it.productId,
        movementType: 'exit',
        quantity: -it.quantity,
        referenceType: 'internal_consumption',
        referenceId: id,
        note: note || null,
      })
    }

    return { id }
  }

  getById(id: number): InternalConsumption {
    if (!Number.isFinite(id) || id <= 0) {
      throw new ValidationError('ID inválido.')
    }
    const row = this.docs.getById(id)
    if (!row) {
      throw new ValidationError('Consumo interno no encontrado.')
    }

    return {
      id: row.header.id,
      cashSessionId: row.header.cash_session_id,
      createdByEmployeeId: row.header.created_by_employee_id,
      reason: row.header.reason,
      status: row.header.status,
      cancelledAt: row.header.cancelled_at,
      cancelledByEmployeeId: row.header.cancelled_by_employee_id,
      cancelReason: row.header.cancel_reason,
      createdAt: row.header.created_at,
      items: row.items.map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        sku: i.sku,
        quantity: Number(i.quantity),
        note: i.note ?? null,
      })),
    }
  }

  listPaged(params: unknown) {
    const p = parsePageParams(params ?? {})
    const total = this.docs.countAll()
    const offset = offsetForPage(p.page, p.pageSize)
    const items = this.docs.listPaged(p.pageSize, offset).map((h) => ({
      id: h.id,
      cashSessionId: h.cash_session_id,
      createdByEmployeeId: h.created_by_employee_id,
      reason: h.reason,
      status: h.status,
      cancelledAt: h.cancelled_at,
      cancelledByEmployeeId: h.cancelled_by_employee_id,
      cancelReason: h.cancel_reason,
      createdAt: h.created_at,
    })) satisfies InternalConsumptionListItem[]

    return { items, total, page: p.page, pageSize: p.pageSize }
  }

  cancel(input: CancelInternalConsumptionInput, actorEmployeeId: number) {
    const parsed = cancelInternalConsumptionSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '))
    }

    const row = this.docs.getById(parsed.data.id)
    if (!row) {
      throw new ValidationError('Consumo interno no encontrado.')
    }
    if (row.header.status !== 'active') {
      throw new ConflictError('El consumo interno ya fue cancelado.')
    }

    const changed = this.docs.cancel({
      id: parsed.data.id,
      cancelledByEmployeeId: actorEmployeeId,
      reason: parsed.data.reason,
    })
    if (changed === 0) {
      throw new ConflictError('No se pudo cancelar (estado inesperado).')
    }

    for (const it of row.items) {
      this.inventory.insertMovement({
        productId: it.product_id,
        movementType: 'adjustment',
        quantity: Number(it.quantity),
        referenceType: 'internal_consumption_cancel',
        referenceId: parsed.data.id,
        note: parsed.data.reason,
      })
    }
  }
}

