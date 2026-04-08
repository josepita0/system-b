export type ProductType = 'simple' | 'compound'

export interface Category {
  id: number
  name: string
  slug: string
  parentId: number | null
  structureLocked: number
  supportsChildren: number
  inheritsSaleFormats: number
  assignedSaleFormatIds: number[]
  effectiveSaleFormatIds: number[]
  inheritedFromCategoryId: number | null
  inheritedFromCategoryName: string | null
  sortOrder: number
  isActive: number
  imageRelPath: string | null
  imageMime: string | null
  pdfRelPath: string | null
  pdfMime: string | null
  pdfOriginalName: string | null
  createdAt: string
  updatedAt: string
}

export interface SaleFormat {
  id: number
  code: string
  name: string
  sortOrder: number
  isActive: number
  requiresComplement: number
  complementCategoryRootId: number | null
  complementCategoryRootName: string | null
  createdAt: string
  updatedAt: string
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
  productCount: number
}

export interface Product {
  id: number
  sku: string
  name: string
  type: ProductType
  categoryId: number
  categoryName: string
  categorySlug: string
  /** Inventario: unitario o progresivo (ml / lotes). */
  consumptionMode: 'unit' | 'progressive'
  salePrice: number
  minStock: number
  /** POS: controla si el producto aparece en la pantalla de ventas. */
  showInSales: number
  isActive: number
  /** Imagen principal obtenida desde `product_images` (galería). */
  primaryImageRelPath: string | null
  imageRelPath: string | null
  imageMime: string | null
  pdfRelPath: string | null
  pdfMime: string | null
  pdfOriginalName: string | null
  createdAt: string
  updatedAt: string
}

export interface ProductInput {
  sku: string
  name: string
  type: ProductType
  categoryId: number
  salePrice: number
  minStock: number
  /** POS: controla si el producto aparece en la pantalla de ventas. */
  showInSales?: number
}

export interface ProductUpdateInput extends ProductInput {
  id: number
}

export interface CategoryInput {
  name: string
  slug: string
  parentId?: number | null
  supportsChildren: boolean
  inheritsSaleFormats: boolean
  sortOrder: number
}

export interface CategoryUpdateInput extends CategoryInput {
  id: number
}

export interface SaleFormatInput {
  code: string
  name: string
  sortOrder: number
  requiresComplement: boolean
  complementCategoryRootId?: number | null
}

export interface SaleFormatUpdateInput extends SaleFormatInput {
  id: number
}

export interface CategorySaleFormatUpdateInput {
  categoryId: number
  saleFormatIds: number[]
}
