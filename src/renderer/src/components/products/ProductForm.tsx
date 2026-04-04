import { useEffect, useState } from 'react'
import type { Product, ProductInput } from '@shared/types/product'
import { Button } from '@renderer/components/ui/Button'
import { cn } from '@renderer/lib/cn'
import { CatalogEntityMediaPanel } from './CatalogEntityMediaPanel'

export interface ProductCategoryOption {
  id: number
  label: string
}

interface ProductFormProps {
  product?: Product | null
  categories: ProductCategoryOption[]
  defaultCategoryId?: number | null
  /** Sin borde ni padding exterior (p. ej. dentro del panel lateral). */
  embedded?: boolean
  onSubmit: (payload: ProductInput) => Promise<void>
  onMediaChanged?: () => Promise<void>
  submitLabel?: string
}

const noopMedia = async () => {}

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
  embedded = false,
  onSubmit,
  onMediaChanged = noopMedia,
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
      sku: product.name.trim(),
      name: product.name,
      type: 'simple',
      categoryId: product.categoryId,
      salePrice: product.salePrice,
      minStock: product.minStock,
    })
  }, [categories, defaultCategoryId, product])

  return (
    <form
      className={cn('grid gap-4', !embedded && 'rounded-2xl border border-border bg-surface-card p-5', embedded && 'gap-4')}
      onSubmit={async (event) => {
        event.preventDefault()
        const nameTrimmed = form.name.trim()
        const payload: ProductInput = {
          ...form,
          name: nameTrimmed,
          sku: nameTrimmed,
          type: 'simple',
        }
        await onSubmit(payload)
        if (!product) {
          setForm(createInitialState(defaultCategoryId ?? categories[0]?.id ?? null))
        }
      }}
    >
      {!embedded ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
          <p className="mt-1 text-sm text-slate-500">Cada producto debe pertenecer a una categoria activa.</p>
        </div>
      ) : null}
      <label className="grid gap-1 text-sm text-slate-700">
        <span>Categoria</span>
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
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
      <label className="grid gap-1 text-sm text-slate-700">
        <span>Nombre del producto</span>
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          placeholder="Nombre"
          value={form.name}
          onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
        />
      </label>
      <label className="grid gap-1 text-sm text-slate-700">
        <span>Precio de venta</span>
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio"
          value={form.salePrice}
          onChange={(event) => setForm((state) => ({ ...state, salePrice: Number(event.target.value) }))}
        />
      </label>
      <label className="grid gap-1 text-sm text-slate-700">
        <span>Stock minimo</span>
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          type="number"
          min="0"
          placeholder="Stock minimo"
          value={form.minStock}
          onChange={(event) => setForm((state) => ({ ...state, minStock: Number(event.target.value) }))}
        />
      </label>
      <Button className="w-full py-2.5 sm:w-auto" disabled={!categories.length} type="submit" variant="primary">
        {submitLabel}
      </Button>
      <CatalogEntityMediaPanel
        entityId={product?.id ?? null}
        imageRelPath={product?.imageRelPath ?? null}
        kind="product"
        onChanged={onMediaChanged}
        pdfOriginalName={product?.pdfOriginalName ?? null}
        pdfRelPath={product?.pdfRelPath ?? null}
      />
    </form>
  )
}
