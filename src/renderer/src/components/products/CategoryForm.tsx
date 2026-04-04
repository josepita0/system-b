import { useEffect, useMemo, useState } from 'react'
import type { Category, CategoryInput } from '@shared/types/product'
import { CatalogEntityMediaPanel } from './CatalogEntityMediaPanel'

interface CategoryFormProps {
  category?: Category | null
  /** Solo creación: fija la categoría padre (p. ej. nueva subcategoría bajo la raíz elegida). */
  defaultParentId?: number | null
  categories: Category[]
  onSubmit: (payload: CategoryInput) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
  onMediaChanged?: () => Promise<void>
  submitLabel?: string
}

const noopMedia = async () => {}

interface FormState {
  name: string
  slug: string
  parentId: number | null
  supportsChildren: boolean
  inheritsSaleFormats: boolean
  sortOrder: number
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildInitialState(category?: Category | null, defaultParentId?: number | null): FormState {
  const isNew = !category
  const parentId = category?.parentId ?? defaultParentId ?? null
  const isNewRoot = isNew && parentId == null
  return {
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    parentId,
    supportsChildren: category ? Boolean(category.supportsChildren) : isNewRoot,
    inheritsSaleFormats: category ? Boolean(category.inheritsSaleFormats) : false,
    sortOrder: category?.sortOrder ?? 0,
  }
}

export function CategoryForm({
  category,
  defaultParentId = null,
  categories,
  onSubmit,
  onCancel,
  onDelete,
  onMediaChanged = noopMedia,
  submitLabel = 'Guardar categoria',
}: CategoryFormProps) {
  const [form, setForm] = useState<FormState>(buildInitialState(category, defaultParentId))
  const [slugTouched, setSlugTouched] = useState(false)
  const parentChangeLocked = Boolean(category?.structureLocked)

  useEffect(() => {
    setForm(buildInitialState(category, defaultParentId))
    setSlugTouched(Boolean(category))
  }, [category, defaultParentId])

  const parentOptions = useMemo(
    () => categories.filter((item) => item.id !== category?.id && item.isActive === 1 && item.supportsChildren === 1),
    [categories, category?.id],
  )

  return (
    <form
      className="grid gap-3 rounded-2xl border border-border bg-surface-card p-1"
      onSubmit={async (event) => {
        event.preventDefault()
        await onSubmit(form)
        if (!category) {
          setForm(buildInitialState(null, defaultParentId))
          setSlugTouched(false)
        }
      }}
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{category ? 'Editar categoria' : 'Nueva categoria'}</h2>
        <p className="mt-1 text-sm text-slate-500">Las categorias pueden ser raiz o hijas de otra categoria.</p>
      </div>
      {parentChangeLocked ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Esta categoria ya entro en operacion y su categoria padre no puede modificarse desde este flujo.
        </div>
      ) : null}
      <label className="grid gap-1 text-sm text-slate-700">
        <span>Nombre de la categoria</span>
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          placeholder="Nombre"
          value={form.name}
          onChange={(event) => {
            const nextName = event.target.value
            setForm((state) => ({
              ...state,
              name: nextName,
              slug: slugTouched ? state.slug : slugify(nextName),
            }))
          }}
        />
      </label>
      <label className="grid gap-1 text-sm text-slate-700">
        <span>Slug de la categoria</span>
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          placeholder="Slug"
          value={form.slug}
          onChange={(event) => {
            setSlugTouched(true)
            setForm((state) => ({ ...state, slug: slugify(event.target.value) }))
          }}
        />
      </label>
     
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          checked={form.supportsChildren}
          onChange={(event) =>
            setForm((state) => ({
              ...state,
              supportsChildren: event.target.checked,
              parentId: event.target.checked && !parentChangeLocked ? null : state.parentId,
              inheritsSaleFormats: event.target.checked && !parentChangeLocked ? false : state.inheritsSaleFormats,
            }))
          }
          type="checkbox"
        />
        Puede contener subcategorias
      </label>
      {form.supportsChildren ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {parentChangeLocked
            ? 'Esta categoria podra seguir utilizandose como categoria padre, pero su ubicacion actual ya no puede cambiarse.'
            : 'Esta categoria quedara en el nivel superior y podra utilizarse como categoria padre.'}
        </div>
      ) : (
        <label className="grid gap-1 text-sm text-slate-700">
          <span>Categoria padre</span>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={parentChangeLocked}
            value={form.parentId ?? ''}
            onChange={(event) => {
              const nextParentId = event.target.value ? Number(event.target.value) : null
              setForm((state) => ({
                ...state,
                parentId: nextParentId,
                inheritsSaleFormats: nextParentId ? state.inheritsSaleFormats || !category : false,
              }))
            }}
          >
            <option value="">Sin categoria padre (nivel superior)</option>
            {parentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          checked={form.inheritsSaleFormats}
          disabled={!form.parentId || form.supportsChildren || parentChangeLocked}
          onChange={(event) => setForm((state) => ({ ...state, inheritsSaleFormats: event.target.checked }))}
          type="checkbox"
        />
        Heredar formatos de la categoria padre
      </label>
      <label className="grid gap-1 text-sm text-slate-700">
        <span>Orden de visualizacion</span>
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          min="0"
          placeholder="Orden"
          type="number"
          value={form.sortOrder}
          onChange={(event) => setForm((state) => ({ ...state, sortOrder: Number(event.target.value) }))}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
          type="submit"
        >
          {submitLabel}
        </button>
        {category ? (
          <button className="rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm text-slate-800" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        {category && onDelete ? (
          <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white" onClick={() => void onDelete()} type="button">
            Desactivar
          </button>
        ) : null}
      </div>
      <CatalogEntityMediaPanel
        entityId={category?.id ?? null}
        imageRelPath={category?.imageRelPath ?? null}
        kind="category"
        onChanged={onMediaChanged}
        pdfOriginalName={category?.pdfOriginalName ?? null}
        pdfRelPath={category?.pdfRelPath ?? null}
      />
    </form>
  )
}
