import type Database from 'better-sqlite3'
import { StockError, ValidationError } from '../errors'

type ProductInfoRow = {
  id: number
  type: 'simple' | 'compound'
  consumption_mode: 'unit' | 'progressive'
  capacity_quantity: number | null
  capacity_unit: string | null
  is_active: number
}

type LotRow = {
  id: number
  remaining_quantity: number
  capacity_quantity: number
  status: 'sealed' | 'open' | 'depleted'
}

export class ProductLotRepository {
  constructor(private readonly db: Database.Database) {}

  getProductInfo(productId: number) {
    const row = this.db
      .prepare(
        `SELECT id, type, consumption_mode, capacity_quantity, capacity_unit, is_active
         FROM products
         WHERE id = ?`,
      )
      .get(productId) as ProductInfoRow | undefined
    return row ?? null
  }

  listLots(productId: number) {
    return this.db
      .prepare(
        `SELECT
           id,
           product_id,
           status,
           capacity_quantity,
           remaining_quantity,
           opened_at,
           depleted_at,
           created_at
         FROM product_lots
         WHERE product_id = ?
         ORDER BY created_at DESC, id DESC`,
      )
      .all(productId) as Array<{
      id: number
      product_id: number
      status: 'sealed' | 'open' | 'depleted'
      capacity_quantity: number
      remaining_quantity: number
      opened_at: string | null
      depleted_at: string | null
      created_at: string
    }>
  }

  updateProductProgressiveConfig(input: {
    productId: number
    consumptionMode: 'unit' | 'progressive'
    capacityQuantity?: number | null
    capacityUnit?: string | null
  }) {
    const info = this.getProductInfo(input.productId)
    if (!info || info.is_active !== 1 || info.type !== 'simple') {
      throw new ValidationError('Producto no encontrado.')
    }
    if (input.consumptionMode === 'progressive') {
      const cap = input.capacityQuantity ?? info.capacity_quantity
      const unit = (input.capacityUnit ?? info.capacity_unit) ?? 'ml'
      if (!cap || !Number.isFinite(cap) || cap <= 0) {
        throw new ValidationError('Debe indicar una capacidad válida.')
      }
      this.db
        .prepare(
          `UPDATE products
           SET consumption_mode = 'progressive',
               capacity_quantity = ?,
               capacity_unit = ?
           WHERE id = ?`,
        )
        .run(cap, unit, input.productId)
      return
    }

    this.db
      .prepare(
        `UPDATE products
         SET consumption_mode = 'unit',
             capacity_quantity = NULL,
             capacity_unit = NULL
         WHERE id = ?`,
      )
      .run(input.productId)
  }

  createSealedLots(productId: number, units: number) {
    if (!Number.isFinite(units) || !Number.isInteger(units) || units <= 0 || units > 1000) {
      throw new ValidationError('Cantidad de unidades inválida.')
    }
    const info = this.getProductInfo(productId)
    if (!info || info.is_active !== 1 || info.type !== 'simple') {
      throw new ValidationError('Producto no encontrado.')
    }
    if (info.consumption_mode !== 'progressive' || !info.capacity_quantity) {
      throw new ValidationError('Producto sin configuración de capacidad para consumo progresivo.')
    }
    const cap = info.capacity_quantity

    const insertLot = this.db.prepare(
      `INSERT INTO product_lots (product_id, status, capacity_quantity, remaining_quantity)
       VALUES (?, 'sealed', ?, ?)`,
    )
    for (let i = 0; i < units; i += 1) {
      insertLot.run(productId, cap, cap)
    }

    return cap * units
  }

  adjustOpenLotRemaining(productId: number, delta: number, referenceType: string, referenceId: number | null) {
    if (!Number.isFinite(delta) || delta === 0) {
      throw new ValidationError('Cantidad inválida.')
    }
    const lot = this.db
      .prepare(
        `SELECT id, remaining_quantity, capacity_quantity, status
         FROM product_lots
         WHERE product_id = ? AND status = 'open'
         ORDER BY opened_at ASC, id ASC
         LIMIT 1`,
      )
      .get(productId) as LotRow | undefined
    if (!lot) {
      throw new ValidationError('No hay una unidad abierta para ajustar.')
    }
    const next = lot.remaining_quantity + delta
    if (next < -0.0000001) {
      throw new StockError('Ajuste inválido: remanente negativo.')
    }
    this.db.prepare('UPDATE product_lots SET remaining_quantity = ? WHERE id = ?').run(next, lot.id)
    this.db
      .prepare(
        `INSERT INTO product_lot_movements (lot_id, product_id, quantity, reference_type, reference_id)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(lot.id, productId, delta, referenceType, referenceId)
  }

  /** Consume `amount` (positive) from lots, opening sealed lots as needed. */
  consumeProgressive(productId: number, amount: number, referenceType: string, referenceId: number | null) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Cantidad de consumo inválida.')
    }

    const info = this.getProductInfo(productId)
    if (!info || info.is_active !== 1 || info.type !== 'simple') {
      throw new ValidationError('Producto no encontrado.')
    }
    if (info.consumption_mode !== 'progressive') {
      throw new ValidationError('El producto no está configurado como consumo progresivo.')
    }

    let remainingToConsume = amount
    while (remainingToConsume > 0.0000001) {
      const openLot = this.db
        .prepare(
          `SELECT id, remaining_quantity, capacity_quantity, status
           FROM product_lots
           WHERE product_id = ? AND status = 'open' AND remaining_quantity > 0
           ORDER BY opened_at ASC, id ASC
           LIMIT 1`,
        )
        .get(productId) as LotRow | undefined

      let lot = openLot
      if (!lot) {
        const sealed = this.db
          .prepare(
            `SELECT id, remaining_quantity, capacity_quantity, status
             FROM product_lots
             WHERE product_id = ? AND status = 'sealed' AND remaining_quantity > 0
             ORDER BY created_at ASC, id ASC
             LIMIT 1`,
          )
          .get(productId) as LotRow | undefined

        if (!sealed) {
          throw new StockError('Stock insuficiente (sin unidades disponibles para consumo progresivo).')
        }

        this.db
          .prepare(
            `UPDATE product_lots
             SET status = 'open',
                 opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP)
             WHERE id = ?`,
          )
          .run(sealed.id)

        lot = { ...sealed, status: 'open' }
      }

      const canConsume = Math.min(remainingToConsume, lot.remaining_quantity)
      const nextRemaining = lot.remaining_quantity - canConsume

      if (nextRemaining < -0.0000001) {
        throw new StockError('Stock insuficiente (remanente inválido).')
      }

      if (nextRemaining <= 0.0000001) {
        this.db
          .prepare(
            `UPDATE product_lots
             SET remaining_quantity = 0,
                 status = 'depleted',
                 depleted_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .run(lot.id)
      } else {
        this.db.prepare(`UPDATE product_lots SET remaining_quantity = ? WHERE id = ?`).run(nextRemaining, lot.id)
      }

      this.db
        .prepare(
          `INSERT INTO product_lot_movements (lot_id, product_id, quantity, reference_type, reference_id)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(lot.id, productId, -canConsume, referenceType, referenceId)

      remainingToConsume -= canConsume
    }
  }
}

