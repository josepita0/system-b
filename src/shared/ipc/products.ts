import type { PagedResult } from '../types/pagination'
import type {
  Category,
  CategoryInput,
  CategorySaleFormatUpdateInput,
  CategoryTreeNode,
  CategoryUpdateInput,
  Product,
  ProductInput,
  ProductUpdateInput,
  SaleFormat,
  SaleFormatInput,
  SaleFormatUpdateInput,
} from '../types/product'

export const productChannels = {
  list: 'products:list',
  listPaged: 'products:listPaged',
  listProgressivePaged: 'products:listProgressivePaged',
  getById: 'products:getById',
  create: 'products:create',
  update: 'products:update',
  remove: 'products:remove',
  listCategories: 'products:listCategories',
  createCategory: 'products:createCategory',
  updateCategory: 'products:updateCategory',
  removeCategory: 'products:removeCategory',
  listSaleFormats: 'products:listSaleFormats',
  createSaleFormat: 'products:createSaleFormat',
  updateSaleFormat: 'products:updateSaleFormat',
  removeSaleFormat: 'products:removeSaleFormat',
  setCategorySaleFormats: 'products:setCategorySaleFormats',
  setCategoryImage: 'products:setCategoryImage',
  clearCategoryImage: 'products:clearCategoryImage',
  setCategoryPdf: 'products:setCategoryPdf',
  clearCategoryPdf: 'products:clearCategoryPdf',
  setProductImage: 'products:setProductImage',
  clearProductImage: 'products:clearProductImage',
  setProductPdf: 'products:setProductPdf',
  clearProductPdf: 'products:clearProductPdf',
  openCatalogPdf: 'products:openCatalogPdf',
} as const

export interface ProductApi {
  list: (categoryId?: number) => Promise<Product[]>
  listPaged: (params: unknown) => Promise<PagedResult<Product>>
  listProgressivePaged: (params: unknown) => Promise<PagedResult<Product>>
  getById: (id: number) => Promise<Product | null>
  create: (payload: ProductInput) => Promise<Product>
  update: (payload: ProductUpdateInput) => Promise<Product>
  remove: (id: number) => Promise<{ success: true }>
  listCategories: () => Promise<CategoryTreeNode[]>
  createCategory: (payload: CategoryInput) => Promise<Category>
  updateCategory: (payload: CategoryUpdateInput) => Promise<Category>
  removeCategory: (id: number) => Promise<{ success: true }>
  listSaleFormats: () => Promise<SaleFormat[]>
  createSaleFormat: (payload: SaleFormatInput) => Promise<SaleFormat>
  updateSaleFormat: (payload: SaleFormatUpdateInput) => Promise<SaleFormat>
  removeSaleFormat: (id: number) => Promise<{ success: true }>
  setCategorySaleFormats: (payload: CategorySaleFormatUpdateInput) => Promise<{ success: true }>
  setCategoryImage: (categoryId: number) => Promise<Category>
  clearCategoryImage: (categoryId: number) => Promise<Category>
  setCategoryPdf: (categoryId: number) => Promise<Category>
  clearCategoryPdf: (categoryId: number) => Promise<Category>
  setProductImage: (productId: number) => Promise<Product>
  clearProductImage: (productId: number) => Promise<Product>
  setProductPdf: (productId: number) => Promise<Product>
  clearProductPdf: (productId: number) => Promise<Product>
  openCatalogPdf: (relPath: string) => Promise<void>
}
