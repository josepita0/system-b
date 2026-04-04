import { describe, expect, it } from 'vitest'
import {
  catalogMediaUrl,
  catalogRelativePathFromRequestUrl,
} from '../../src/shared/lib/catalogMediaUrl'

describe('catalogMediaUrl', () => {
  it('returns null for empty input', () => {
    expect(catalogMediaUrl(null)).toBeNull()
    expect(catalogMediaUrl('')).toBeNull()
    expect(catalogMediaUrl('   ')).toBeNull()
  })

  it('builds protocol URL with encoded segments', () => {
    expect(catalogMediaUrl('products/12/foto.png')).toBe('catalog-media://media/products/12/foto.png')
    expect(catalogMediaUrl('cat/a b.pdf')).toBe('catalog-media://media/cat/a%20b.pdf')
  })
})

describe('catalogRelativePathFromRequestUrl', () => {
  it('resolves host media + full path', () => {
    expect(catalogRelativePathFromRequestUrl('catalog-media://media/products/12/foto.png')).toBe(
      'products/12/foto.png',
    )
  })

  it('resolves legacy triple-slash without host', () => {
    expect(catalogRelativePathFromRequestUrl('catalog-media:///products/12/foto.png')).toBe(
      'products/12/foto.png',
    )
  })

  it('repara path cuando Chromium interpretó products como hostname', () => {
    expect(catalogRelativePathFromRequestUrl('catalog-media://products/12/foto.png')).toBe(
      'products/12/foto.png',
    )
  })
})
