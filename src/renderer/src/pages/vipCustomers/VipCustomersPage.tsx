import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { cn } from '@renderer/lib/cn'
import { tableTheadClass } from '@renderer/lib/tableStyles'
import type { VipCustomer, VipCustomerConditionType, VipCustomerInput } from '@shared/types/vipCustomer'

const vipCustomersKey = ['vipCustomers', 'list'] as const

const conditionLabel: Record<VipCustomerConditionType, string> = {
  discount_manual: 'Precio diferenciado (manual)',
  exempt: 'Exoneración de cobro',
}

function emptyForm(): VipCustomerInput {
  return { name: '', conditionType: 'discount_manual', isActive: true, documentId: null, phone: null, notes: null }
}

export function VipCustomersPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<VipCustomer | null>(null)
  const [form, setForm] = useState<VipCustomerInput>(emptyForm())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: vipCustomersKey,
    queryFn: () => window.api.vipCustomers.list(),
  })

  const selectedId = selected?.id ?? null
  const isEditing = selectedId != null

  const sorted = useMemo(() => (listQuery.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)), [listQuery.data])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: vipCustomersKey })
  }

  const createMutation = useMutation({
    mutationFn: (payload: VipCustomerInput) => window.api.vipCustomers.create(payload),
    onSuccess: async (row) => {
      setSelected(row)
      setForm({
        name: row.name,
        conditionType: row.conditionType,
        isActive: row.isActive === 1,
        documentId: row.documentId,
        phone: row.phone,
        notes: row.notes,
      })
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear el cliente VIP.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: VipCustomerInput) =>
      selectedId != null ? window.api.vipCustomers.update({ id: selectedId, ...payload }) : Promise.reject(new Error('Seleccione un cliente.')),
    onSuccess: async (row) => {
      setSelected(row)
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar el cliente VIP.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.vipCustomers.remove(id),
    onSuccess: async () => {
      setSelected(null)
      setForm(emptyForm())
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible eliminar el cliente VIP.')
    },
  })

  const pick = (row: VipCustomer) => {
    setSelected(row)
    setForm({
      name: row.name,
      conditionType: row.conditionType,
      isActive: row.isActive === 1,
      documentId: row.documentId,
      phone: row.phone,
      notes: row.notes,
    })
    setErrorMessage(null)
  }

  const startNew = () => {
    setSelected(null)
    setForm(emptyForm())
    setErrorMessage(null)
  }

  const inputClass =
    'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30'

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clientes VIP</h1>
        <p className="text-sm text-slate-500">Registro de clientes con exoneración o precio diferenciado.</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="min-h-0 shadow-sm" padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Listado</h2>
            <Button onClick={startNew} type="button" variant="secondary">
              Nuevo
            </Button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Seleccione una fila para cargarla en el formulario.</p>

          {listQuery.isLoading ? <div className="mt-4 text-sm text-slate-500">Cargando...</div> : null}
          {listQuery.error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {listQuery.error instanceof Error ? listQuery.error.message : 'No fue posible cargar la lista.'}
            </div>
          ) : null}

          {!listQuery.isLoading && !listQuery.error ? (
            <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner">
              <table className="min-w-full text-left text-sm text-slate-800">
                <thead className={tableTheadClass}>
                  <tr>
                    <th className="px-3 py-3">Nombre</th>
                    <th className="px-3 py-3">Condición</th>
                    <th className="px-3 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, index) => {
                    const isSelected = selectedId === row.id
                    return (
                      <tr
                        aria-label={`Seleccionar ${row.name}`}
                        className={cn(
                          'cursor-pointer border-t border-slate-200 transition-colors',
                          isSelected
                            ? 'bg-brand/10 ring-2 ring-inset ring-brand/40 hover:bg-brand/15'
                            : index % 2 === 0
                              ? 'bg-white hover:bg-slate-50'
                              : 'bg-slate-50/80 hover:bg-slate-100/80',
                        )}
                        key={row.id}
                        onClick={() => pick(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            pick(row)
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="px-3 py-3 font-medium text-slate-900">{row.name}</td>
                        <td className="px-3 py-3 text-slate-700">{conditionLabel[row.conditionType]}</td>
                        <td className="px-3 py-3">
                          {row.isActive === 1 ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Activo</span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Inactivo</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!sorted.length ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={3}>
                        Sin clientes VIP.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card className="min-h-0 shadow-sm" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900">{isEditing ? 'Editar cliente VIP' : 'Crear cliente VIP'}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-medium text-slate-700">Nombre</span>
              <input className={inputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Documento (opcional)</span>
              <input
                className={inputClass}
                value={form.documentId ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, documentId: e.target.value.trim() ? e.target.value : null }))}
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Teléfono (opcional)</span>
              <input
                className={inputClass}
                value={form.phone ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.trim() ? e.target.value : null }))}
              />
            </label>

            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-medium text-slate-700">Condición</span>
              <select
                className={inputClass}
                value={form.conditionType}
                onChange={(e) => setForm((p) => ({ ...p, conditionType: e.target.value as VipCustomerConditionType }))}
              >
                <option value="discount_manual">{conditionLabel.discount_manual}</option>
                <option value="exempt">{conditionLabel.exempt}</option>
              </select>
            </label>

            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-medium text-slate-700">Notas (opcional)</span>
              <textarea
                className={inputClass}
                rows={4}
                value={form.notes ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value.trim() ? e.target.value : null }))}
              />
            </label>

            <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                className="size-4 rounded border-slate-300 accent-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                checked={form.isActive ?? true}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                type="checkbox"
              />
              Activo
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
              onClick={() => {
                if (isEditing) {
                  updateMutation.mutate(form)
                } else {
                  createMutation.mutate(form)
                }
              }}
              variant="primary"
            >
              {isEditing ? 'Guardar cambios' : 'Crear'}
            </Button>
            {isEditing ? (
              <Button
                disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                onClick={() => selectedId != null && deleteMutation.mutate(selectedId)}
                variant="danger"
              >
                Eliminar
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </section>
  )
}

