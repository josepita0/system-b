import { useEffect, useState } from 'react'
import type { Category, SaleFormat, SaleFormatInput } from '@shared/types/product'
import { Button } from '@renderer/components/ui/Button'
import { Modal } from '@renderer/components/ui/Modal'

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
  const [formatModalOpen, setFormatModalOpen] = useState(false)
  const [editingFormat, setEditingFormat] = useState<SaleFormat | null>(null)
  const [form, setForm] = useState<FormState>(buildInitialState())
  const selectedAssignedSaleFormatIds = selectedCategory?.assignedSaleFormatIds ?? []
  const selectedEffectiveSaleFormatIds = selectedCategory?.effectiveSaleFormatIds ?? []
  const [draftAssignmentIds, setDraftAssignmentIds] = useState<number[]>(selectedAssignedSaleFormatIds)

  useEffect(() => {
    setDraftAssignmentIds(selectedAssignedSaleFormatIds)
  }, [selectedAssignedSaleFormatIds, selectedCategory?.id])

  useEffect(() => {
    setForm(buildInitialState(editingFormat))
  }, [editingFormat, formatModalOpen])

  const closeFormatModal = () => {
    setFormatModalOpen(false)
    setEditingFormat(null)
  }

  const openNewFormat = () => {
    setEditingFormat(null)
    setFormatModalOpen(true)
  }

  const openEditFormat = (sf: SaleFormat) => {
    setEditingFormat(sf)
    setFormatModalOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Catalogo de formatos</h2>
          <p className="mt-1 text-sm text-slate-500">Formatos reutilizables; se asignan por categoria abajo.</p>
        </div>
        <Button className="w-full shrink-0 sm:w-auto" onClick={openNewFormat} type="button" variant="primary">
          Nuevo formato
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-slate-50/80 p-3 shadow-inner">
        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm text-slate-800">
          {saleFormats.map((saleFormat) => (
            <li
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-sm"
              key={saleFormat.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {saleFormat.name} <span className="font-normal text-slate-500">({saleFormat.code})</span>
                </p>
                <p className="text-xs text-slate-500">
                  Orden {saleFormat.sortOrder}
                  {saleFormat.requiresComplement && saleFormat.complementCategoryRootName
                    ? ` · complemento: ${saleFormat.complementCategoryRootName}`
                    : ''}
                </p>
              </div>
              <Button className="shrink-0 px-3 py-1.5 text-xs" onClick={() => openEditFormat(saleFormat)} type="button" variant="secondary">
                Editar
              </Button>
            </li>
          ))}
          {saleFormats.length === 0 ? <li className="py-2 text-center text-sm text-slate-500">No hay formatos activos.</li> : null}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Formatos por categoria</h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedCategory ? `Categoria: ${selectedCategory.name}` : 'Seleccione una categoria en Subcategorias para asignar formatos.'}
          </p>
        </div>
        {selectedCategory?.inheritsSaleFormats ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            Esta categoria hereda los formatos de
            {selectedCategory.inheritedFromCategoryName ? ` ${selectedCategory.inheritedFromCategoryName}` : ' su categoria padre'}.
            Si deseas personalizarla, primero debes desligar la herencia.
          </div>
        ) : null}
        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
          {saleFormats.map((saleFormat) => (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              key={saleFormat.id}
            >
              <input
                checked={(selectedCategory?.inheritsSaleFormats ? selectedEffectiveSaleFormatIds : draftAssignmentIds).includes(saleFormat.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand"
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
          <Button
            className="disabled:opacity-50"
            disabled={!selectedCategory || Boolean(selectedCategory.inheritsSaleFormats)}
            onClick={() => void onSaveAssignments([...new Set(draftAssignmentIds)])}
            type="button"
            variant="primary"
          >
            Guardar formatos propios
          </Button>
          {selectedCategory?.parentId ? (
            <Button
              onClick={() => void onToggleInheritance(!Boolean(selectedCategory.inheritsSaleFormats))}
              type="button"
              variant="secondary"
            >
              {selectedCategory.inheritsSaleFormats ? 'Desligar herencia' : 'Volver a heredar'}
            </Button>
          ) : null}
        </div>
      </div>

      <Modal
        maxWidthClass="max-w-md"
        onClose={closeFormatModal}
        open={formatModalOpen}
        title={editingFormat ? 'Editar formato' : 'Nuevo formato'}
      >
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (editingFormat) {
              await onUpdate({ id: editingFormat.id, ...form })
              closeFormatModal()
              return
            }

            await onCreate(form)
            closeFormatModal()
          }}
        >
          <p className="text-sm text-slate-500">Los formatos son reutilizables y se habilitan por categoria.</p>
          <label className="grid gap-1 text-sm text-slate-700">
            <span>Codigo del formato</span>
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
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
          <label className="grid gap-1 text-sm text-slate-700">
            <span>Nombre del formato</span>
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Nombre"
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            />
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
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
          <label className="grid gap-1 text-sm text-slate-700">
            <span>Categoria raiz de complemento</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
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
          <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="submit" variant="primary">
              {editingFormat ? 'Guardar cambios' : 'Crear formato'}
            </Button>
            {editingFormat ? (
              <>
                <Button onClick={closeFormatModal} type="button" variant="secondary">
                  Cancelar
                </Button>
                <Button
                  className="ml-auto"
                  onClick={async () => {
                    await onDelete(editingFormat.id)
                    closeFormatModal()
                  }}
                  type="button"
                  variant="danger"
                >
                  Desactivar
                </Button>
              </>
            ) : (
              <Button onClick={closeFormatModal} type="button" variant="secondary">
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
