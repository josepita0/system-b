import type { AuthenticatedUser } from '@shared/types/user'
import type { CategoryTreeNode, Product, SaleFormat } from '@shared/types/product'
import type { SaleFormatConsumptionRule } from '@shared/types/consumptionRule'
import type { VipCustomer } from '@shared/types/vipCustomer'
import type { ShiftDefinition } from '@shared/types/shift'

export const DEMO_CURRENCY = 'USD'
export const DEMO_MIN_OPENING_CASH = 200
export const DEMO_MANAGER: AuthenticatedUser = {
  id: 1, firstName: 'Carlos', lastName: 'Barra', documentId: 'DEMO-001', email: 'demo@systembarra.app',
  username: 'carlos', role: 'manager', isActive: 1, mustChangePassword: 0, lastLoginAt: null,
  createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z',
  permissions: ['sales.use', 'shifts.open', 'shifts.manage', 'reports.manage', 'vip.manage'],
}

const stamp = '2026-01-01T08:00:00.000Z'
const category = (id: number, name: string, slug: string, parentId: number | null = null): CategoryTreeNode => ({
  id, name, slug, parentId, structureLocked: 0, supportsChildren: 1, inheritsSaleFormats: 0,
  assignedSaleFormatIds: [], effectiveSaleFormatIds: [], inheritedFromCategoryId: null, inheritedFromCategoryName: null,
  sortOrder: id, isActive: 1, imageRelPath: null, imageMime: null, pdfRelPath: null, pdfMime: null,
  pdfOriginalName: null, createdAt: stamp, updatedAt: stamp, children: [], productCount: 0,
})

export const saleFormats: SaleFormat[] = [
  { id: 1, code: 'simple', name: 'Simple', sortOrder: 1, isActive: 1, requiresComplement: 0, complementCategoryRootId: null, complementCategoryRootName: null, createdAt: stamp, updatedAt: stamp },
  { id: 2, code: 'combined', name: 'Combinado', sortOrder: 2, isActive: 1, requiresComplement: 1, complementCategoryRootId: 4, complementCategoryRootName: 'Mezcladores', createdAt: stamp, updatedAt: stamp },
]

const product = (id: number, name: string, price: number, categoryId: number, type: 'simple' | 'compound' = 'simple'): Product => ({
  id, sku: `DEMO-${String(id).padStart(3, '0')}`, name, type, categoryId, categoryName: categoryId === 2 ? 'Tragos' : categoryId === 3 ? 'Snacks' : categoryId === 4 ? 'Mezcladores' : 'Bebidas',
  categorySlug: categoryId === 2 ? 'tragos' : categoryId === 3 ? 'snacks' : categoryId === 4 ? 'mezcladores' : 'bebidas', consumptionMode: 'unit', salePrice: price,
  complementSalePrice: null, minStock: 5, showInSales: 1, isActive: 1, primaryImageRelPath: null, imageRelPath: null, imageMime: null,
  pdfRelPath: null, pdfMime: null, pdfOriginalName: null, createdAt: stamp, updatedAt: stamp,
})

export const products: Product[] = [
  product(1, 'Cerveza rubia', 2.5, 1), product(2, 'Cerveza negra', 3, 1), product(3, 'Agua mineral', 1.5, 1),
  product(4, 'Gaseosa cola', 2, 1), product(5, 'Fernet preparado', 12, 2, 'compound'), product(6, 'Gin tonic', 11.5, 2),
  product(7, 'Mojito', 10, 2), product(8, 'Daiquiri', 10.5, 2), product(9, 'Papas fritas', 6, 3),
  product(10, 'Nachos con queso', 8.5, 3), product(11, 'Mani salado', 3.5, 3), product(12, 'Pizza individual', 9, 3),
  product(13, 'Cola', 2, 4), product(14, 'Agua tónica', 2.5, 4),
]

export const categories: CategoryTreeNode[] = (() => {
  const drinks = category(1, 'Bebidas', 'bebidas')
  drinks.assignedSaleFormatIds = [1, 2]; drinks.effectiveSaleFormatIds = [1, 2]
  const cocktails = category(2, 'Tragos', 'tragos'); cocktails.assignedSaleFormatIds = [1]; cocktails.effectiveSaleFormatIds = [1]
  const snacks = category(3, 'Snacks', 'snacks'); snacks.assignedSaleFormatIds = [1]; snacks.effectiveSaleFormatIds = [1]
  const mixers = category(4, 'Mezcladores', 'mezcladores', 1); mixers.assignedSaleFormatIds = [1]; mixers.effectiveSaleFormatIds = [1]
  drinks.children = [mixers]; drinks.productCount = 6; cocktails.productCount = 4; snacks.productCount = 4; mixers.productCount = 2
  return [drinks, cocktails, snacks]
})()

export const vipCustomers: VipCustomer[] = [{ id: 1, name: 'Lucía Fernández', documentId: null, phone: null, notes: 'Cliente frecuente', conditionType: 'discount_manual', isActive: 1, createdAt: stamp, updatedAt: stamp }]
export const shifts: ShiftDefinition[] = [{ id: 1, code: 'day', name: 'Día', startTime: '08:00', endTime: '18:00', crossesMidnight: 0 }, { id: 2, code: 'night', name: 'Noche', startTime: '18:00', endTime: '08:00', crossesMidnight: 1 }]
export const consumptionRules: SaleFormatConsumptionRule[] = products.map((p, i) => ({ id: i + 1, productId: p.id, saleFormatId: null, consumeQuantity: 1, unit: 'unidad', basePrice: p.salePrice, createdAt: stamp }))
export const compoundBom = new Map([[5, 2]])
