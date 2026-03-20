import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Category, CategoryInput, CategoryTreeNode, Product, ProductInput, SaleFormatInput } from '@shared/types/product'
import { CategoryForm } from '@renderer/components/products/CategoryForm'
import { CategoryTree } from '@renderer/components/products/CategoryTree'
import { ProductForm } from '@renderer/components/products/ProductForm'
import { SaleFormatManager } from '@renderer/components/products/SaleFormatManager'
import { ProductTable } from '@renderer/components/products/ProductTable'

function flattenCategoryTree(nodes: CategoryTreeNode[], depth = 0): Array<CategoryTreeNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenCategoryTree(node.children, depth + 1),
  ])
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: () => window.api.products.listCategories(),
  })

  const saleFormatsQuery = useQuery({
    queryKey: ['products', 'sale-formats'],
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
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
    [flatCategories],
  )
  const selectedCategory = flatCategories.find((category) => category.id === selectedCategoryId) ?? null
  const rootCategories = categoryEntities.filter((category) => category.parentId === null)

  useEffect(() => {
    if (!flatCategories.length) {
      setSelectedCategoryId(null)
      setEditingCategory(null)
      setSelected(null)
      return
    }

    if (!selectedCategoryId || !flatCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(flatCategories[0].id)
    }
  }, [flatCategories, selectedCategoryId])

  const productsQuery = useQuery({
    queryKey: ['products', { categoryId: selectedCategoryId }],
    queryFn: () => window.api.products.list(selectedCategoryId ?? undefined),
    enabled: selectedCategoryId !== null,
  })

  const createMutation = useMutation({
    mutationFn: (payload: ProductInput) => window.api.products.create(payload),
    onSuccess: async () => {
      setSelected(null)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear el producto.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ProductInput) =>
      selected ? window.api.products.update({ id: selected.id, ...payload }) : Promise.resolve(null),
    onSuccess: async () => {
      setSelected(null)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar el producto.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.products.remove(id),
    onSuccess: async (_result, id) => {
      setSelected((current) => (current?.id === id ? null : current))
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible desactivar el producto.')
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (payload: CategoryInput) => window.api.products.createCategory(payload),
    onSuccess: async (category) => {
      setEditingCategory(null)
      setSelectedCategoryId(category.id)
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear la categoria.')
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: (payload: CategoryInput) =>
      editingCategory ? window.api.products.updateCategory({ id: editingCategory.id, ...payload }) : Promise.resolve(null),
    onSuccess: async (category) => {
      setEditingCategory(null)
      if (category) {
        setSelectedCategoryId(category.id)
      }
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar la categoria.')
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => window.api.products.removeCategory(id),
    onSuccess: async () => {
      setEditingCategory(null)
      setSelected(null)
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible desactivar la categoria.')
    },
  })

  const createSaleFormatMutation = useMutation({
    mutationFn: (payload: SaleFormatInput) => window.api.products.createSaleFormat(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products', 'sale-formats'] })
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear el formato.')
    },
  })

  const updateSaleFormatMutation = useMutation({
    mutationFn: (payload: SaleFormatInput & { id: number }) => window.api.products.updateSaleFormat(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products', 'sale-formats'] })
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar el formato.')
    },
  })

  const deleteSaleFormatMutation = useMutation({
    mutationFn: (id: number) => window.api.products.removeSaleFormat(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products', 'sale-formats'] })
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
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
      await queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible guardar los formatos de la categoria.')
    },
  })

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return productsQuery.data ?? []
    }

    return (productsQuery.data ?? []).filter((product) =>
      `${product.sku} ${product.name}`.toLowerCase().includes(term),
    )
  }, [productsQuery.data, search])

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Catalogo por categorias</h1>
        <p className="text-sm text-slate-400">
          Administra categorias jerarquicas, productos asociados y formatos de venta habilitados por categoria.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-800 bg-slate-900 p-4 text-sm text-rose-300">{errorMessage}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <CategoryForm
            categories={categoryEntities}
            category={editingCategory}
            onCancel={() => setEditingCategory(null)}
            onDelete={
              editingCategory
                ? async () => {
                    setErrorMessage(null)
                    await deleteCategoryMutation.mutateAsync(editingCategory.id)
                  }
                : undefined
            }
            onSubmit={async (payload) => {
              setErrorMessage(null)
              if (editingCategory) {
                await updateCategoryMutation.mutateAsync(payload)
                return
              }

              await createCategoryMutation.mutateAsync(payload)
            }}
            submitLabel={editingCategory ? 'Guardar categoria' : 'Crear categoria'}
          />
          <CategoryTree
            categories={categoriesQuery.data ?? []}
            onSelect={(category) => {
              setSelectedCategoryId(category.id)
              setEditingCategory(category)
              setSelected(null)
            }}
            selectedCategoryId={selectedCategoryId}
          />
        </div>

        <div className="space-y-4">
          <ProductForm
            categories={categoryOptions}
            defaultCategoryId={selectedCategoryId}
            product={selected}
            submitLabel={selected ? 'Guardar producto' : 'Crear producto'}
            onSubmit={async (payload) => {
              setErrorMessage(null)
              if (selected) {
                await updateMutation.mutateAsync(payload)
                return
              }

              await createMutation.mutateAsync(payload)
            }}
          />

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedCategory ? `Productos de ${selectedCategory.name}` : 'Productos'}
                </h2>
                <p className="text-sm text-slate-400">
                  {selectedCategory
                    ? 'El listado se filtra por la categoria seleccionada.'
                    : 'Seleccione una categoria para administrar sus productos.'}
                </p>
              </div>
              <input
                className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                placeholder="Buscar por SKU o nombre"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <ProductTable
              onDelete={(id) => deleteMutation.mutate(id)}
              onEdit={setSelected}
              products={filteredProducts}
              selectedProductId={selected?.id ?? null}
            />
          </div>
        </div>

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
            if (!selectedCategory) {
              return
            }

            setErrorMessage(null)
            await updateCategoryMutation.mutateAsync({
              name: selectedCategory.name,
              slug: selectedCategory.slug,
              parentId: selectedCategory.parentId,
              supportsChildren: Boolean(selectedCategory.supportsChildren),
              inheritsSaleFormats,
              sortOrder: selectedCategory.sortOrder,
            })
          }}
          onUpdate={async (payload) => {
            setErrorMessage(null)
            await updateSaleFormatMutation.mutateAsync(payload)
          }}
          rootCategories={rootCategories}
          saleFormats={saleFormatsQuery.data ?? []}
          selectedCategory={selectedCategory}
        />
      </div>
    </section>
  )
}
