import { describe, expect, it } from 'vitest'
import { updateCashSettingsSchema } from '../../src/shared/schemas/cashSettingsSchema'

describe('cashSettingsSchema', () => {
  it('accepts non-negative finite values', () => {
    expect(updateCashSettingsSchema.parse({ minOpeningCash: 0 }).minOpeningCash).toBe(0)
    expect(updateCashSettingsSchema.parse({ minOpeningCash: 10.5 }).minOpeningCash).toBe(10.5)
  })

  it('rejects negative values', () => {
    expect(() => updateCashSettingsSchema.parse({ minOpeningCash: -1 })).toThrow()
  })
})

