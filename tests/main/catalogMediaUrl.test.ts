import { describe, expect, it } from 'vitest'
import { catalogMediaUrl } from '../../src/shared/lib/catalogMediaUrl'

describe('catalogMediaUrl', () => {
  it('returns null for empty input', () => {
    expect(catalogMediaUrl(null)).toBeNull()
    expect(catalogMediaUrl('')).toBeNull()
    expect(catalogMediaUrl('   ')).toBeNull()
  })

  it('builds protocol URL with encoded segments', () => {
    expect(catalogMediaUrl('products/12/foto.png')).toBe('catalog-media:///products/12/foto.png')
    expect(catalogMediaUrl('cat/a b.pdf')).toBe('catalog-media:///cat/a%20b.pdf')
  })
})
