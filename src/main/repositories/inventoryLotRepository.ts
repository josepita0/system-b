import type Database from 'better-sqlite3'
import { StockError, ValidationError } from '../errors'

type IngredientInfoRow = {
  id: number
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

export class InventoryLotRepository {
  constructor(private readonly db: Database.Database) {}

  getIngredientInfo(ingredientId: number) {
    const row = this.db
      .prepare(
        `SELECT id, consumption_mode, capacity_quantity, capacity_unit, is_active
         FROM ingredients
         WHERE id = ?`,
      )
      .get(ingredientId) as IngredientInfoRow | undefined
    return row ?? null
  }

  listLots(ingredientId: number) {
    return this.db
      .prepare(
        `SELECT
           id,
           ingredient_id,
           status,
           capacity_quantity,
           remaining_quantity,
           opened_at,
           depleted_at,
           created_at
         FROM inventory_lots
         WHERE ingredient_id = ?
         ORDER BY created_at DESC, id DESC`,
      )
      .all(ingredientId) as Array<{
      id: number
      ingredient_id: number
      status: 'sealed' | 'open' | 'depleted'
      capacity_quantity: number
      remaining_quantity: number
      opened_at: string | null
      depleted_at: string | null
      created_at: string
    }>
  }

  updateIngredientProgressiveConfig(input: {
    ingredientId: number
    consumptionMode: 'unit' | 'progressive'
    capacityQuantity?: number | null
    capacityUnit?: string | null
  }) {
    const info = this.getIngredientInfo(input.ingredientId)
    if (!info || info.is_active !== 1) {
      throw new ValidationError('Ingrediente no encontrado.')
    }
    if (input.consumptionMode === 'progressive') {
      const cap = input.capacityQuantity ?? info.capacity_quantity
      const unit = (input.capacityUnit ?? info.capacity_unit) ?? 'ml'
      if (!cap || !Number.isFinite(cap) || cap <= 0) {
        throw new ValidationError('Debe indicar una capacidad válida.')
      }
      this.db
        .prepare(
          `UPDATE ingredients
           SET consumption_mode = 'progressive',
               capacity_quantity = ?,
               capacity_unit = ?
           WHERE id = ?`,
        )
        .run(cap, unit, input.ingredientId)
      return
    }
    this.db
      .prepare(
        `UPDATE ingredients
         SET consumption_mode = 'unit',
             capacity_quantity = NULL,
             capacity_unit = NULL
         WHERE id = ?`,
      )
      .run(input.ingredientId)
  }

  createSealedLots(ingredientId: number, units: number) {
    if (!Number.isFinite(units) || !Number.isInteger(units) || units <= 0 || units > 1000) {
      throw new ValidationError('Cantidad de unidades inválida.')
    }
    const info = this.getIngredientInfo(ingredientId)
    if (!info || info.is_active !== 1) {
      throw new ValidationError('Ingrediente no encontrado.')
    }
    if (info.consumption_mode !== 'progressive' || !info.capacity_quantity) {
      throw new ValidationError('Ingrediente sin configuración de capacidad para consumo progresivo.')
    }
    const cap = info.capacity_quantity

    const insertLot = this.db.prepare(
      `INSERT INTO inventory_lots (ingredient_id, status, capacity_quantity, remaining_quantity)
       VALUES (?, 'sealed', ?, ?)`,
    )
    for (let i = 0; i < units; i += 1) {
      insertLot.run(ingredientId, cap, cap)
    }

    return cap * units
  }

  /** Consume `amount` (positive) from lots, opening sealed lots as needed. */
  consumeProgressive(ingredientId: number, amount: number, referenceType: string, referenceId: number | null) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Cantidad de consumo inválida.')
    }

    const info = this.getIngredientInfo(ingredientId)
    if (!info || info.is_active !== 1) {
      throw new ValidationError('Ingrediente no encontrado.')
    }
    if (info.consumption_mode !== 'progressive') {
      throw new ValidationError('El ingrediente no está configurado como consumo progresivo.')
    }

    let remainingToConsume = amount
    while (remainingToConsume > 0.0000001) {
      const openLot = this.db
        .prepare(
          `SELECT id, remaining_quantity, capacity_quantity, status
           FROM inventory_lots
           WHERE ingredient_id = ? AND status = 'open' AND remaining_quantity > 0
           ORDER BY opened_at ASC, id ASC
           LIMIT 1`,
        )
        .get(ingredientId) as LotRow | undefined

      let lot = openLot
      if (!lot) {
        const sealed = this.db
          .prepare(
            `SELECT id, remaining_quantity, capacity_quantity, status
             FROM inventory_lots
             WHERE ingredient_id = ? AND status = 'sealed' AND remaining_quantity > 0
             ORDER BY created_at ASC, id ASC
             LIMIT 1`,
          )
          .get(ingredientId) as LotRow | undefined

        if (!sealed) {
          throw new StockError('Stock insuficiente (sin unidades disponibles para consumo progresivo).')
        }

        this.db
          .prepare(
            `UPDATE inventory_lots
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
            `UPDATE inventory_lots
             SET remaining_quantity = 0,
                 status = 'depleted',
                 depleted_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .run(lot.id)
      } else {
        this.db
          .prepare(
            `UPDATE inventory_lots
             SET remaining_quantity = ?
             WHERE id = ?`,
          )
          .run(nextRemaining, lot.id)
      }

      this.db
        .prepare(
          `INSERT INTO inventory_lot_movements (lot_id, ingredient_id, quantity, reference_type, reference_id)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(lot.id, ingredientId, -canConsume, referenceType, referenceId)

      remainingToConsume -= canConsume
    }
  }
}

