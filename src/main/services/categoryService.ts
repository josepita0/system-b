import { ZodError } from 'zod'
import type { CategoryInput, CategorySaleFormatUpdateInput, CategoryTreeNode, CategoryUpdateInput } from '../../shared/types/product'
import { categorySaleFormatUpdateSchema, categorySchema, categoryUpdateSchema } from '../../shared/schemas/productSchema'
import { ConflictError, NotFoundError, ValidationError } from '../errors'
import { CategoryRepository } from '../repositories/categoryRepository'
import { SaleFormatRepository } from '../repositories/saleFormatRepository'

function normalizeZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}

export class CategoryService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly saleFormats: SaleFormatRepository,
  ) {}

  listTree() {
    const rows = this.categories.listWithStats()
    const nodeMap = new Map<number, CategoryTreeNode>()
    const roots: CategoryTreeNode[] = []

    for (const row of rows) {
      nodeMap.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        parentId: row.parent_id,
        structureLocked: row.structure_locked,
        supportsChildren: row.supports_children,
        inheritsSaleFormats: row.inherits_sale_formats,
        assignedSaleFormatIds: row.assigned_sale_format_ids
          ? row.assigned_sale_format_ids.split(',').map((value) => Number(value))
          : [],
        effectiveSaleFormatIds: [],
        inheritedFromCategoryId: null,
        inheritedFromCategoryName: null,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        productCount: row.product_count,
        children: [],
      })
    }

    const resolveEffectiveSaleFormats = (node: CategoryTreeNode): number[] => {
      if (!node.inheritsSaleFormats || !node.parentId) {
        node.inheritedFromCategoryId = null
        node.inheritedFromCategoryName = null
        node.effectiveSaleFormatIds = [...node.assignedSaleFormatIds]
        return node.effectiveSaleFormatIds
      }

      const parent = nodeMap.get(node.parentId)
      if (!parent) {
        node.inheritedFromCategoryId = null
        node.inheritedFromCategoryName = null
        node.effectiveSaleFormatIds = [...node.assignedSaleFormatIds]
        return node.effectiveSaleFormatIds
      }

      node.inheritedFromCategoryId = parent.id
      node.inheritedFromCategoryName = parent.name
      node.effectiveSaleFormatIds = [...resolveEffectiveSaleFormats(parent)]
      return node.effectiveSaleFormatIds
    }

    for (const node of nodeMap.values()) {
      resolveEffectiveSaleFormats(node)
    }

    for (const node of nodeMap.values()) {
      if (!node.parentId) {
        roots.push(node)
        continue
      }

      const parent = nodeMap.get(node.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }

    const sortNodes = (nodes: CategoryTreeNode[]) => {
      nodes.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
      for (const node of nodes) {
        sortNodes(node.children)
      }
    }

    sortNodes(roots)
    return roots
  }

  create(input: CategoryInput) {
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    this.ensureSlugAvailable(parsed.data.slug)
    this.ensureParentIsValid(parsed.data.parentId ?? null)
    const created = this.categories.create(parsed.data)

    if (parsed.data.parentId) {
      this.categories.lockStructure(parsed.data.parentId)
    }

    return created
  }

  update(input: CategoryUpdateInput) {
    const parsed = categoryUpdateSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const existing = this.categories.getById(parsed.data.id)
    if (!existing || !existing.isActive) {
      throw new NotFoundError('Categoria no encontrada.')
    }

    this.ensureSlugAvailable(parsed.data.slug, parsed.data.id)
    this.ensureParentIsValid(parsed.data.parentId ?? null, parsed.data.id)

    if (parsed.data.parentId) {
      const descendants = this.categories.getDescendantIds(parsed.data.id)
      if (descendants.includes(parsed.data.parentId)) {
        throw new ValidationError('No puede mover la categoria dentro de una de sus subcategorias.')
      }
    }

    if (existing.structureLocked && existing.parentId !== (parsed.data.parentId ?? null)) {
      throw new ValidationError('La categoria ya se encuentra bloqueada estructuralmente y no puede cambiar de categoria padre desde este flujo.')
    }

    const updated = this.categories.update(parsed.data)

    if (parsed.data.parentId) {
      this.categories.lockStructure(parsed.data.parentId)
    }

    return updated
  }

  remove(id: number) {
    const existing = this.categories.getById(id)
    if (!existing || !existing.isActive) {
      throw new NotFoundError('Categoria no encontrada.')
    }

    if (existing.slug === 'general') {
      throw new ValidationError('La categoria General se reserva para compatibilidad del catalogo.')
    }

    if (this.categories.countActiveChildren(id) > 0) {
      throw new ValidationError('No puede desactivar una categoria que todavia tiene subcategorias activas.')
    }

    if (this.categories.countActiveProducts(id) > 0) {
      throw new ValidationError('No puede desactivar una categoria con productos activos.')
    }

    this.categories.softDelete(id)
    return { success: true as const }
  }

  setEnabledSaleFormats(input: CategorySaleFormatUpdateInput) {
    const parsed = categorySaleFormatUpdateSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(normalizeZodError(parsed.error))
    }

    const category = this.categories.getById(parsed.data.categoryId)
    if (!category || !category.isActive) {
      throw new NotFoundError('Categoria no encontrada.')
    }

    if (category.inheritsSaleFormats) {
      throw new ValidationError('La categoria esta heredando formatos de su categoria padre. Desligue la herencia antes de editar la lista propia.')
    }

    const uniqueIds = [...new Set(parsed.data.saleFormatIds)]
    for (const saleFormatId of uniqueIds) {
      if (!this.saleFormats.existsActive(saleFormatId)) {
        throw new ValidationError('Solo puede habilitar formatos de venta activos.')
      }
    }

    this.categories.replaceSaleFormats(parsed.data.categoryId, uniqueIds)
    this.categories.lockStructure(parsed.data.categoryId)
    return { success: true as const }
  }

  private ensureSlugAvailable(slug: string, currentId?: number) {
    const existing = this.categories.getBySlug(slug)
    if (existing && existing.id !== currentId) {
      throw new ConflictError('El slug de categoria ya existe.')
    }
  }

  private ensureParentIsValid(parentId: number | null, currentId?: number) {
    if (!parentId) {
      return
    }

    if (currentId && currentId === parentId) {
      throw new ValidationError('La categoria no puede ser hija de si misma.')
    }

    const parent = this.categories.getById(parentId)
    if (!parent || !parent.isActive) {
      throw new ValidationError('La categoria padre no existe o esta inactiva.')
    }

    if (!parent.supportsChildren) {
      throw new ValidationError('La categoria padre seleccionada no admite subcategorias.')
    }
  }
}
