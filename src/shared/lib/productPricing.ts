/** Precio unitario cuando el producto se usa como complemento (p. ej. combinado). Si no hay precio específico, coincide con el precio de venta. */
export function effectiveComplementUnitPrice(product: {
  salePrice: number
  complementSalePrice: number | null
}): number {
  return product.complementSalePrice ?? product.salePrice
}
