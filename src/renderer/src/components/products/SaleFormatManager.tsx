import { useEffect, useState } from 'react'
import type { Category, SaleFormat, SaleFormatInput } from '@shared/types/product'

interface SaleFormatManagerProps {
  saleFormats: SaleFormat[]
  rootCategories: Category[]
  selectedCategory: Category | null
  onCreate: (payload: SaleFormatInput) => Promise<void>
  onUpdate: (payload: SaleFormatInput & { id: number }) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onSaveAssignments: (saleFormatIds: number[]) => Promise<void>
  onToggleInheritance: (inheritsSaleFormats: boolean) => Promise<void>
}

interface FormState {
  code: string
  name: string
  sortOrder: number
  requiresComplement: boolean
  complementCategoryRootId: number | null
}

function buildInitialState(saleFormat?: SaleFormat | null): FormState {
  return {
    code: saleFormat?.code ?? '',
    name: saleFormat?.name ?? '',
    sortOrder: saleFormat?.sortOrder ?? 0,
    requiresComplement: Boolean(saleFormat?.requiresComplement),
    complementCategoryRootId: saleFormat?.complementCategoryRootId ?? null,
  }
}

export function SaleFormatManager({
  saleFormats,
  rootCategories,
  selectedCategory,
  onCreate,
  onUpdate,
  onDelete,
  onSaveAssignments,
  onToggleInheritance,
}: SaleFormatManagerProps) {
  const [selected, setSelected] = useState<SaleFormat | null>(null)
  const [form, setForm] = useState<FormState>(buildInitialState())
  const selectedAssignedSaleFormatIds = selectedCategory?.assignedSaleFormatIds ?? []
  const selectedEffectiveSaleFormatIds = selectedCategory?.effectiveSaleFormatIds ?? []
  const [draftAssignmentIds, setDraftAssignmentIds] = useState<number[]>(selectedAssignedSaleFormatIds)

  useEffect(() => {
    setDraftAssignmentIds(selectedAssignedSaleFormatIds)
  }, [selectedAssignedSaleFormatIds, selectedCategory?.id])

  useEffect(() => {
    setForm(buildInitialState(selected))
  }, [selected])

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
        onSubmit={async (event) => {
          event.preventDefault()
          if (selected) {
            await onUpdate({ id: selected.id, ...form })
            setSelected(null)
            return
          }

          await onCreate(form)
          setForm(buildInitialState())
        }}
      >
        <div>
          <h2 className="text-lg font-semibold text-white">{selected ? 'Editar formato' : 'Nuevo formato'}</h2>
          <p className="mt-1 text-sm text-slate-400">Los formatos son reutilizables y se habilitan por categoria.</p>
        </div>
        <label className="grid gap-1 text-sm text-slate-300">
          <span>Codigo del formato</span>
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Codigo (ej. combinado)"
            value={form.code}
            onChange={(event) =>
              setForm((state) => ({
                ...state,
                code: event.target.value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, ''),
              }))
            }
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-300">
          <span>Nombre del formato</span>
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Nombre"
            value={form.name}
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-300">
          <span>Orden de visualizacion</span>
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            min="0"
            placeholder="Orden"
            type="number"
            value={form.sortOrder}
            onChange={(event) => setForm((state) => ({ ...state, sortOrder: Number(event.target.value) }))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            checked={form.requiresComplement}
            onChange={(event) =>
              setForm((state) => ({
                ...state,
                requiresComplement: event.target.checked,
                complementCategoryRootId: event.target.checked ? state.complementCategoryRootId : null,
              }))
            }
            type="checkbox"
          />
          Requiere complemento de otra categoria
        </label>
        <label className="grid gap-1 text-sm text-slate-300">
          <span>Categoria raiz de complemento</span>
          <select
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            disabled={!form.requiresComplement}
            value={form.complementCategoryRootId ?? ''}
            onChange={(event) =>
              setForm((state) => ({
                ...state,
                complementCategoryRootId: event.target.value ? Number(event.target.value) : null,
              }))
            }
          >
            <option value="">Seleccione categoria raiz de complemento</option>
            {rootCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950" type="submit">
            {selected ? 'Guardar cambios' : 'Crear formato'}
          </button>
          {selected ? (
            <>
              <button
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white"
                onClick={() => setSelected(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm text-white"
                onClick={async () => {
                  await onDelete(selected.id)
                  setSelected(null)
                }}
                type="button"
              >
                Desactivar
              </button>
            </>
          ) : null}
        </div>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-white">Catalogo de formatos</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {saleFormats.map((saleFormat) => (
            <li className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2" key={saleFormat.id}>
              <div>
                <p className="font-medium">
                  {saleFormat.name} <span className="text-slate-500">({saleFormat.code})</span>
                </p>
                <p className="text-xs text-slate-400">
                  Orden {saleFormat.sortOrder}
                  {saleFormat.requiresComplement && saleFormat.complementCategoryRootName
                    ? ` | complemento desde ${saleFormat.complementCategoryRootName}`
                    : ''}
                </p>
              </div>
              <button className="rounded-md bg-slate-700 px-3 py-1 text-white" onClick={() => setSelected(saleFormat)} type="button">
                Editar
              </button>
            </li>
          ))}
          {saleFormats.length === 0 ? <li className="text-slate-500">No hay formatos activos.</li> : null}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Formatos por categoria</h2>
          <p className="mt-1 text-sm text-slate-400">
            {selectedCategory ? `Categoria seleccionada: ${selectedCategory.name}` : 'Seleccione una categoria para asignar formatos.'}
          </p>
        </div>
        {selectedCategory?.inheritsSaleFormats ? (
          <div className="mt-4 rounded-xl border border-amber-700 bg-slate-950 px-3 py-3 text-sm text-amber-200">
            Esta categoria hereda los formatos de
            {selectedCategory.inheritedFromCategoryName ? ` ${selectedCategory.inheritedFromCategoryName}` : ' su categoria padre'}.
            Si deseas personalizarla, primero debes desligar la herencia.
          </div>
        ) : null}
        <div className="mt-4 space-y-2">
          {saleFormats.map((saleFormat) => (
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-200" key={saleFormat.id}>
              <input
                checked={(selectedCategory?.inheritsSaleFormats ? selectedEffectiveSaleFormatIds : draftAssignmentIds).includes(saleFormat.id)}
                disabled={Boolean(selectedCategory?.inheritsSaleFormats)}
                onChange={(event) =>
                  setDraftAssignmentIds((state) =>
                    event.target.checked ? [...state, saleFormat.id] : state.filter((id) => id !== saleFormat.id),
                  )
                }
                type="checkbox"
              />
              <span>{saleFormat.name}</span>
            </label>
          ))}
          {saleFormats.length === 0 ? <p className="text-sm text-slate-500">Cree formatos antes de asignarlos.</p> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            disabled={!selectedCategory || Boolean(selectedCategory.inheritsSaleFormats)}
            onClick={() => void onSaveAssignments([...new Set(draftAssignmentIds)])}
            type="button"
          >
            Guardar formatos propios
          </button>
          {selectedCategory?.parentId ? (
            <button
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white"
              onClick={() => void onToggleInheritance(!Boolean(selectedCategory.inheritsSaleFormats))}
              type="button"
            >
              {selectedCategory.inheritsSaleFormats ? 'Desligar herencia' : 'Volver a heredar'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
