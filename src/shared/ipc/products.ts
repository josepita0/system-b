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
} as const

export interface ProductApi {
  list: (categoryId?: number) => Promise<Product[]>
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
}
