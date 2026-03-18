import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Product, ProductInput } from '@shared/types/product'
import { ProductForm } from '@renderer/components/products/ProductForm'
import { ProductTable } from '@renderer/components/products/ProductTable'

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Product | null>(null)
  const [search, setSearch] = useState('')

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => window.api.products.list(),
  })

  const createMutation = useMutation({
    mutationFn: (payload: ProductInput) => window.api.products.create(payload),
    onSuccess: async () => {
      setSelected(null)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ProductInput) =>
      selected ? window.api.products.update({ id: selected.id, ...payload }) : Promise.resolve(null),
    onSuccess: async () => {
      setSelected(null)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.products.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
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
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <ProductForm
        product={selected}
        onSubmit={async (payload) => {
          if (selected) {
            await updateMutation.mutateAsync(payload)
            return
          }

          await createMutation.mutateAsync(payload)
        }}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Productos</h1>
            <p className="text-sm text-slate-400">Primera vertical del MVP: catalogo base para POS e inventario.</p>
          </div>
          <input
            className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            placeholder="Buscar por SKU o nombre"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <ProductTable
          products={filteredProducts}
          onEdit={setSelected}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </div>
    </section>
  )
}
