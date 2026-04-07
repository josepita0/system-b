import { describe, expect, it } from 'vitest'
import { offsetForPage, parsePageParams } from '../../src/shared/schemas/paginationSchema'
import { MAX_PAGE_SIZE } from '../../src/shared/types/pagination'

describe('paginationSchema', () => {
  it('parses defaults', () => {
    const p = parsePageParams({})
    expect(p.page).toBe(1)
    expect(p.pageSize).toBeGreaterThan(0)
  })

  it('rejects page size above max', () => {
    expect(() => parsePageParams({ page: 1, pageSize: MAX_PAGE_SIZE + 1 })).toThrow()
  })

  it('offsetForPage matches page and size', () => {
    expect(offsetForPage(1, 25)).toBe(0)
    expect(offsetForPage(3, 10)).toBe(20)
  })
})
