import { useEffect, useState } from 'react'
import type { Product, ProductInput } from '@shared/types/product'

export interface ProductCategoryOption {
  id: number
  label: string
}

interface ProductFormProps {
  product?: Product | null
  categories: ProductCategoryOption[]
  defaultCategoryId?: number | null
  onSubmit: (payload: ProductInput) => Promise<void>
  submitLabel?: string
}

function createInitialState(categoryId?: number | null): ProductInput {
  return {
    sku: '',
    name: '',
    type: 'simple',
    categoryId: categoryId ?? 0,
    salePrice: 0,
    minStock: 0,
  }
}

export function ProductForm({
  product,
  categories,
  defaultCategoryId,
  onSubmit,
  submitLabel = 'Guardar producto',
}: ProductFormProps) {
  const initialState = createInitialState(defaultCategoryId ?? categories[0]?.id ?? null)
  const [form, setForm] = useState<ProductInput>(initialState)

  useEffect(() => {
    if (!product) {
      setForm(createInitialState(defaultCategoryId ?? categories[0]?.id ?? null))
      return
    }

    setForm({
      sku: product.sku,
      name: product.name,
      type: product.type,
      categoryId: product.categoryId,
      salePrice: product.salePrice,
      minStock: product.minStock,
    })
  }, [categories, defaultCategoryId, product])

  return (
    <form
      className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
      onSubmit={async (event) => {
        event.preventDefault()
        await onSubmit(form)
        if (!product) {
          setForm(createInitialState(defaultCategoryId ?? categories[0]?.id ?? null))
        }
      }}
    >
      <div>
        <h2 className="text-lg font-semibold text-white">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
        <p className="mt-1 text-sm text-slate-400">Cada producto debe pertenecer a una categoria activa.</p>
      </div>
      <label className="grid gap-1 text-sm text-slate-300">
        <span>Categoria</span>
        <select
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          value={form.categoryId}
          onChange={(event) => setForm((state) => ({ ...state, categoryId: Number(event.target.value) }))}
        >
          <option value={0}>Seleccione una categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm text-slate-300">
        <span>SKU</span>
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="SKU"
          value={form.sku}
          onChange={(event) => setForm((state) => ({ ...state, sku: event.target.value }))}
        />
      </label>
      <label className="grid gap-1 text-sm text-slate-300">
        <span>Nombre del producto</span>
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Nombre"
          value={form.name}
          onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
        />
      </label>
      <label className="grid gap-1 text-sm text-slate-300">
        <span>Tipo de producto</span>
        <select
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          value={form.type}
          onChange={(event) => setForm((state) => ({ ...state, type: event.target.value as ProductInput['type'] }))}
        >
          <option value="simple">Simple</option>
          <option value="compound">Compuesto</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm text-slate-300">
        <span>Precio de venta</span>
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio"
          value={form.salePrice}
          onChange={(event) => setForm((state) => ({ ...state, salePrice: Number(event.target.value) }))}
        />
      </label>
      <label className="grid gap-1 text-sm text-slate-300">
        <span>Stock minimo</span>
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          type="number"
          min="0"
          placeholder="Stock minimo"
          value={form.minStock}
          onChange={(event) => setForm((state) => ({ ...state, minStock: Number(event.target.value) }))}
        />
      </label>
      <button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50" disabled={!categories.length} type="submit">
        {submitLabel}
      </button>
    </form>
  )
}
