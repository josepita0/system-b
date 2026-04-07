import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Category,
  CategoryInput,
  CategoryTreeNode,
  CategoryUpdateInput,
  Product,
  ProductInput,
  SaleFormatInput,
} from '@shared/types/product'
import { CatalogProductDrawer } from '@renderer/components/products/CatalogProductDrawer'
import { CategoryForm } from '@renderer/components/products/CategoryForm'
import { ProductForm } from '@renderer/components/products/ProductForm'
import { SaleFormatManager } from '@renderer/components/products/SaleFormatManager'
import { ProductTable } from '@renderer/components/products/ProductTable'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { Modal } from '@renderer/components/ui/Modal'
import { TablePagination } from '@renderer/components/ui/TablePagination'
import { cn } from '@renderer/lib/cn'
import { DEFAULT_PAGE_SIZE } from '@shared/types/pagination'
import { selectFieldClass } from '@renderer/components/pos/posFieldClasses'

const categoriesKey = ['products', 'categories'] as const
const saleFormatsKey = ['products', 'sale-formats'] as const

function flattenCategoryTree(nodes: CategoryTreeNode[], depth = 0): Array<CategoryTreeNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenCategoryTree(node.children, depth + 1),
  ])
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryModalDefaultParentId, setCategoryModalDefaultParentId] = useState<number | null>(null)
  const [productDrawerOpen, setProductDrawerOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const categoriesQuery = useQuery({
    queryKey: categoriesKey,
    queryFn: () => window.api.products.listCategories(),
  })

  const saleFormatsQuery = useQuery({
    queryKey: saleFormatsKey,
    queryFn: () => window.api.products.listSaleFormats(),
  })

  const flatCategories = useMemo(() => flattenCategoryTree(categoriesQuery.data ?? []), [categoriesQuery.data])
  const categoryOptions = useMemo(
    () =>
      flatCategories.map((category) => ({
        id: category.id,
        label: `${'-- '.repeat(category.depth)}${category.name}`,
      })),
    [flatCategories],
  )
  const categoryEntities = useMemo<Category[]>(
    () =>
      flatCategories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        structureLocked: category.structureLocked,
        supportsChildren: category.supportsChildren,
        inheritsSaleFormats: category.inheritsSaleFormats,
        assignedSaleFormatIds: category.assignedSaleFormatIds ?? [],
        effectiveSaleFormatIds: category.effectiveSaleFormatIds ?? [],
        inheritedFromCategoryId: category.inheritedFromCategoryId ?? null,
        inheritedFromCategoryName: category.inheritedFromCategoryName ?? null,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        imageRelPath: category.imageRelPath ?? null,
        imageMime: category.imageMime ?? null,
        pdfRelPath: category.pdfRelPath ?? null,
        pdfMime: category.pdfMime ?? null,
        pdfOriginalName: category.pdfOriginalName ?? null,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
    [flatCategories],
  )

  const rootCategories = useMemo(() => categoryEntities.filter((c) => c.parentId === null), [categoryEntities])
  const subcategoriesOfRoot = useMemo(
    () => (selectedRootId == null ? [] : categoryEntities.filter((c) => c.parentId === selectedRootId)),
    [categoryEntities, selectedRootId],
  )

  const selectedCategoryEntity = useMemo(
    () => categoryEntities.find((c) => c.id === selectedCategoryId) ?? null,
    [categoryEntities, selectedCategoryId],
  )

  useEffect(() => {
    if (!categoryEntities.length) {
      setSelectedCategoryId(null)
      setSelectedRootId(null)
      setEditingCategory(null)
      setSelected(null)
      setProductDrawerOpen(false)
      return
    }

    setSelectedRootId((prev) => {
      if (prev && rootCategories.some((r) => r.id === prev)) {
        return prev
      }
      return rootCategories[0]?.id ?? null
    })
  }, [categoryEntities, rootCategories])

  useEffect(() => {
    if (selectedRootId == null) {
      return
    }

    const subs = categoryEntities.filter((c) => c.parentId === selectedRootId)
    setSelectedCategoryId((prev) => {
      if (subs.length) {
        if (prev && subs.some((s) => s.id === prev)) {
          return prev
        }
        return subs[0].id
      }
      return selectedRootId
    })
  }, [selectedRootId, categoryEntities])

  const productsQuery = useQuery({
    queryKey: ['products', 'list', 'paged', selectedCategoryId, page, pageSize, search],
    queryFn: () =>
      window.api.products.listPaged({
        page,
        pageSize,
        categoryId: selectedCategoryId ?? undefined,
        search: search.trim() || undefined,
      }),
    enabled: selectedCategoryId !== null,
  })

  const pagedProducts = productsQuery.data?.items ?? []
  const totalProductsList = productsQuery.data?.total ?? 0

  const maxProductPage = useMemo(() => Math.max(1, Math.ceil(totalProductsList / pageSize)), [totalProductsList, pageSize])

  useEffect(() => {
    if (page > maxProductPage) {
      setPage(maxProductPage)
    }
  }, [page, maxProductPage])

  useEffect(() => {
    setPage(1)
  }, [selectedCategoryId, search, pageSize])

  const refreshProducts = async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const refreshCategories = async () => {
    await queryClient.invalidateQueries({ queryKey: categoriesKey })
  }

  const refreshSaleFormats = async () => {
    await queryClient.invalidateQueries({ queryKey: saleFormatsKey })
  }

  const closeProductDrawer = useCallback(() => {
    setProductDrawerOpen(false)
    setSelected(null)
  }, [])

  const closeCategoryModal = useCallback(() => {
    setCategoryModalOpen(false)
    setEditingCategory(null)
    setCategoryModalDefaultParentId(null)
  }, [])

  const createMutation = useMutation({
    mutationFn: (payload: ProductInput) => window.api.products.create(payload),
    onSuccess: async () => {
      closeProductDrawer()
      await Promise.all([refreshProducts(), refreshCategories()])
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear el producto.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ProductInput) =>
      selected ? window.api.products.update({ id: selected.id, ...payload }) : Promise.resolve(null),
    onSuccess: async () => {
      closeProductDrawer()
      await Promise.all([refreshProducts(), refreshCategories()])
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar el producto.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.products.remove(id),
    onSuccess: async (_result, id) => {
      setSelected((current) => (current?.id === id ? null : current))
      if (selected?.id === id) {
        closeProductDrawer()
      }
      await Promise.all([refreshProducts(), refreshCategories()])
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible desactivar el producto.')
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (payload: CategoryInput) => window.api.products.createCategory(payload),
    onSuccess: async (category) => {
      closeCategoryModal()
      setSelectedCategoryId(category.id)
      if (category.parentId != null) {
        setSelectedRootId(category.parentId)
      } else {
        setSelectedRootId(category.id)
      }
      await refreshCategories()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear la categoria.')
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: (payload: CategoryUpdateInput) => window.api.products.updateCategory(payload),
    onSuccess: async (category) => {
      closeCategoryModal()
      if (category) {
        setSelectedCategoryId(category.id)
        if (category.parentId != null) {
          setSelectedRootId(category.parentId)
        } else {
          setSelectedRootId(category.id)
        }
      }
      await refreshCategories()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar la categoria.')
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => window.api.products.removeCategory(id),
    onSuccess: async () => {
      closeCategoryModal()
      setSelected(null)
      closeProductDrawer()
      await Promise.all([refreshCategories(), refreshProducts()])
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible desactivar la categoria.')
    },
  })

  const createSaleFormatMutation = useMutation({
    mutationFn: (payload: SaleFormatInput) => window.api.products.createSaleFormat(payload),
    onSuccess: async () => {
      await Promise.all([refreshSaleFormats(), refreshCategories()])
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear el formato.')
    },
  })

  const updateSaleFormatMutation = useMutation({
    mutationFn: (payload: SaleFormatInput & { id: number }) => window.api.products.updateSaleFormat(payload),
    onSuccess: async () => {
      await Promise.all([refreshSaleFormats(), refreshCategories()])
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar el formato.')
    },
  })

  const deleteSaleFormatMutation = useMutation({
    mutationFn: (id: number) => window.api.products.removeSaleFormat(id),
    onSuccess: async () => {
      await Promise.all([refreshSaleFormats(), refreshCategories()])
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible desactivar el formato.')
    },
  })

  const saveCategoryFormatsMutation = useMutation({
    mutationFn: (saleFormatIds: number[]) => {
      if (!selectedCategoryId) {
        return Promise.resolve({ success: true as const })
      }

      return window.api.products.setCategorySaleFormats({
        categoryId: selectedCategoryId,
        saleFormatIds,
      })
    },
    onSuccess: async () => {
      await refreshCategories()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible guardar los formatos de la categoria.')
    },
  })

  const categoryModalTitle = editingCategory
    ? 'Editar categoria'
    : categoryModalDefaultParentId != null
      ? 'Nueva subcategoria'
      : 'Nueva categoria'

  const openAddRoot = () => {
    setErrorMessage(null)
    setEditingCategory(null)
    setCategoryModalDefaultParentId(null)
    setCategoryModalOpen(true)
  }

  const openAddSub = () => {
    if (selectedRootId == null) {
      return
    }
    setErrorMessage(null)
    setEditingCategory(null)
    setCategoryModalDefaultParentId(selectedRootId)
    setCategoryModalOpen(true)
  }

  const openEditCategory = (cat: Category) => {
    setErrorMessage(null)
    setCategoryModalDefaultParentId(null)
    setEditingCategory(cat)
    setCategoryModalOpen(true)
  }

  const selectRootForContext = (rootId: number) => {
    setSelectedRootId(rootId)
  }

  const selectSubcategoryForProducts = (id: number) => {
    setSelectedCategoryId(id)
  }

  const openNewProduct = () => {
    setErrorMessage(null)
    setSelected(null)
    setProductDrawerOpen(true)
  }

  const openEditProduct = (product: Product) => {
    setErrorMessage(null)
    setSelected(product)
    setProductDrawerOpen(true)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Catalogo y gestion</h1>
        <p className="text-sm text-slate-500">
          Categorias raiz, subcategorias y productos. Los formatos de venta se definen en catalogo y se asignan por categoria.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{errorMessage}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Categorias</h2>
            <Button className="w-full sm:w-auto" onClick={openAddRoot} type="button" variant="primary">
              Agregar categoria
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {rootCategories.map((cat) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0" key={cat.id}>
                <button
                  className={cn(
                    'min-w-0 flex-1 text-left text-sm font-medium',
                    selectedRootId === cat.id ? 'text-brand' : 'text-slate-900 hover:text-brand',
                  )}
                  onClick={() => selectRootForContext(cat.id)}
                  type="button"
                >
                  {cat.name}
                </button>
                <div className="flex shrink-0 gap-2">
                  <Button className="px-2 py-1.5 text-xs" onClick={() => openEditCategory(cat)} type="button" variant="secondary">
                    Editar
                  </Button>
                  <Button
                    className="px-2 py-1.5 text-xs"
                    disabled={deleteCategoryMutation.isPending}
                    onClick={() => {
                      void (async () => {
                        setErrorMessage(null)
                        await deleteCategoryMutation.mutateAsync(cat.id)
                      })()
                    }}
                    type="button"
                    variant="danger"
                  >
                    Desactivar
                  </Button>
                </div>
              </li>
            ))}
            {rootCategories.length === 0 ? <li className="py-4 text-sm text-slate-500">No hay categorias raiz.</li> : null}
          </ul>
        </Card>

        <Card padding="md">
          <div className="mb-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Subcategorias</h2>
            <label className="block text-xs font-medium text-slate-600">
              Categoria padre
              <select
                className={cn(selectFieldClass, 'mt-1.5')}
                disabled={!rootCategories.length}
                onChange={(e) => setSelectedRootId(Number(e.target.value))}
                value={selectedRootId ?? ''}
              >
                {rootCategories.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="w-full"
              disabled={selectedRootId == null}
              onClick={openAddSub}
              type="button"
              variant="primary"
            >
              Agregar subcategoria
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {subcategoriesOfRoot.map((cat) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0" key={cat.id}>
                <button
                  className={cn(
                    'min-w-0 flex-1 text-left text-sm font-medium',
                    selectedCategoryId === cat.id ? 'text-brand' : 'text-slate-900 hover:text-brand',
                  )}
                  onClick={() => selectSubcategoryForProducts(cat.id)}
                  type="button"
                >
                  {cat.name}
                </button>
                <div className="flex shrink-0 gap-2">
                  <Button className="px-2 py-1.5 text-xs" onClick={() => openEditCategory(cat)} type="button" variant="secondary">
                    Editar
                  </Button>
                  <Button
                    className="px-2 py-1.5 text-xs"
                    disabled={deleteCategoryMutation.isPending}
                    onClick={() => {
                      void (async () => {
                        setErrorMessage(null)
                        await deleteCategoryMutation.mutateAsync(cat.id)
                      })()
                    }}
                    type="button"
                    variant="danger"
                  >
                    Desactivar
                  </Button>
                </div>
              </li>
            ))}
            {selectedRootId != null && subcategoriesOfRoot.length === 0 ? (
              <li className="py-4 text-sm text-slate-500">
                Esta categoria no tiene subcategorias. Puede cargar productos directamente en la raiz (se usa la raiz como categoria de producto).
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="shadow-sm" padding="md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Productos
                {selectedCategoryEntity ? (
                  <span className="block text-sm font-normal text-slate-500 sm:mt-1 sm:inline sm:before:content-['—_']">
                    {selectedCategoryEntity.name}
                  </span>
                ) : null}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Listado filtrado por la categoria seleccionada en Subcategorias (o la raiz si no hay hijas).
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[min(100%,20rem)] sm:flex-row sm:items-center">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner"
                placeholder="Buscar por nombre"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button
                className="shrink-0"
                disabled={selectedCategoryId == null}
                onClick={openNewProduct}
                type="button"
                variant="primary"
              >
                Nuevo producto
              </Button>
            </div>
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden border-2 border-slate-200/90 shadow-md">
          <div className="min-h-[14rem] w-full overflow-x-auto">
            <ProductTable
              onDelete={(id) => deleteMutation.mutate(id)}
              onEdit={openEditProduct}
              products={pagedProducts}
              selectedProductId={selected?.id ?? null}
            />
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={totalProductsList}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </Card>
      </div>

      <details className="mt-2 rounded-2xl border border-border bg-slate-50/80 shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span>Formatos de venta (catalogo y asignacion por categoria)</span>
            <span aria-hidden className="text-slate-400">
              ▼
            </span>
          </span>
        </summary>
        <div className="border-t border-border px-4 pb-4 pt-1">
          <SaleFormatManager
            onCreate={async (payload) => {
              setErrorMessage(null)
              await createSaleFormatMutation.mutateAsync(payload)
            }}
            onDelete={async (id) => {
              setErrorMessage(null)
              await deleteSaleFormatMutation.mutateAsync(id)
            }}
            onSaveAssignments={async (saleFormatIds) => {
              setErrorMessage(null)
              await saveCategoryFormatsMutation.mutateAsync(saleFormatIds)
            }}
            onToggleInheritance={async (inheritsSaleFormats) => {
              if (!selectedCategoryEntity) {
                return
              }

              setErrorMessage(null)
              await updateCategoryMutation.mutateAsync({
                id: selectedCategoryEntity.id,
                name: selectedCategoryEntity.name,
                slug: selectedCategoryEntity.slug,
                parentId: selectedCategoryEntity.parentId ?? null,
                supportsChildren: Boolean(selectedCategoryEntity.supportsChildren),
                inheritsSaleFormats,
                sortOrder: selectedCategoryEntity.sortOrder,
              })
            }}
            onUpdate={async (payload) => {
              setErrorMessage(null)
              await updateSaleFormatMutation.mutateAsync(payload)
            }}
            rootCategories={rootCategories}
            saleFormats={saleFormatsQuery.data ?? []}
            selectedCategory={selectedCategoryEntity}
          />
        </div>
      </details>

      <CatalogProductDrawer
        onClose={closeProductDrawer}
        open={productDrawerOpen}
        title={selected?.name ?? 'Nuevo producto'}
      >
        <ProductForm
          categories={categoryOptions}
          defaultCategoryId={selectedCategoryId}
          embedded
          onMediaChanged={async () => {
            await Promise.all([refreshProducts(), refreshCategories()])
          }}
          product={selected}
          submitLabel={selected ? 'Guardar cambios' : 'Crear producto'}
          onSubmit={async (payload) => {
            setErrorMessage(null)
            if (selected) {
              await updateMutation.mutateAsync(payload)
              return
            }

            await createMutation.mutateAsync(payload)
          }}
        />
      </CatalogProductDrawer>

      <Modal maxWidthClass="max-w-lg" onClose={closeCategoryModal} open={categoryModalOpen} title={categoryModalTitle}>
        <CategoryForm
          categories={categoryEntities}
          category={editingCategory}
          defaultParentId={editingCategory ? null : categoryModalDefaultParentId}
          onCancel={closeCategoryModal}
          onDelete={
            editingCategory
              ? async () => {
                  setErrorMessage(null)
                  await deleteCategoryMutation.mutateAsync(editingCategory.id)
                }
              : undefined
          }
          onMediaChanged={refreshCategories}
          onSubmit={async (payload) => {
            setErrorMessage(null)
            if (editingCategory) {
              await updateCategoryMutation.mutateAsync({ id: editingCategory.id, ...payload })
              return
            }

            await createCategoryMutation.mutateAsync(payload)
          }}
          submitLabel={editingCategory ? 'Guardar categoria' : 'Crear categoria'}
        />
      </Modal>
    </section>
  )
}
