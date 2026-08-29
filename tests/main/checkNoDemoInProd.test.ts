import { describe, expect, it } from 'vitest'
import { findDemoMarkers } from '../../scripts/check-no-demo-in-prod.mjs'

describe('production demo exclusion proof', () => {
  it('finds demo markers in generated assets', () => {
    expect(findDemoMarkers('safe code installDemoApi Reiniciar demo')).toEqual(['Reiniciar demo', 'installDemoApi'])
  })
  it('accepts assets without demo markers', () => {
    expect(findDemoMarkers('production renderer only')).toEqual([])
  })
})
