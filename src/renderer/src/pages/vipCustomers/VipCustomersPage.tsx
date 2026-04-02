import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

  return (
    <div className="grid grid-cols-[360px_1fr] gap-4 rounded-3xl bg-slate-950 p-4">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Clientes VIP</h2>
            <p className="mt-1 text-sm text-slate-400">Registro de clientes con exoneración o precio diferenciado.</p>
          </div>
          <button
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200"
            onClick={() => {
              setSelected(null)
              setForm(emptyForm())
              setErrorMessage(null)
            }}
            type="button"
          >
            Nuevo
          </button>
        </div>

        {listQuery.isLoading ? <div className="text-sm text-slate-400">Cargando...</div> : null}
        {listQuery.error ? (
          <div className="rounded-xl border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">
            {listQuery.error instanceof Error ? listQuery.error.message : 'No fue posible cargar la lista.'}
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {sorted.map((row) => (
            <button
              key={row.id}
              className={`w-full rounded-xl border px-3 py-3 text-left ${
                selectedId === row.id ? 'border-cyan-700 bg-slate-800' : 'border-slate-800 bg-slate-950'
              }`}
              onClick={() => pick(row)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-100">{row.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{conditionLabel[row.conditionType]}</div>
                </div>
                <div className={`text-xs ${row.isActive === 1 ? 'text-emerald-300' : 'text-slate-400'}`}>{row.isActive === 1 ? 'Activo' : 'Inactivo'}</div>
              </div>
            </button>
          ))}
          {!sorted.length && !listQuery.isLoading ? <div className="text-sm text-slate-400">Sin clientes VIP.</div> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-white">{isEditing ? 'Editar cliente VIP' : 'Crear cliente VIP'}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm text-slate-300">
            Nombre
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-300">
            Documento (opcional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              value={form.documentId ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, documentId: e.target.value.trim() ? e.target.value : null }))}
            />
          </label>

          <label className="text-sm text-slate-300">
            Teléfono (opcional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              value={form.phone ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.trim() ? e.target.value : null }))}
            />
          </label>

          <label className="col-span-2 text-sm text-slate-300">
            Condición
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              value={form.conditionType}
              onChange={(e) => setForm((p) => ({ ...p, conditionType: e.target.value as VipCustomerConditionType }))}
            >
              <option value="discount_manual">{conditionLabel.discount_manual}</option>
              <option value="exempt">{conditionLabel.exempt}</option>
            </select>
          </label>

          <label className="col-span-2 text-sm text-slate-300">
            Notas (opcional)
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              rows={4}
              value={form.notes ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value.trim() ? e.target.value : null }))}
            />
          </label>

          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-300">
            <input
              checked={form.isActive ?? true}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              type="checkbox"
            />
            Activo
          </label>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">{errorMessage}</div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
            onClick={() => {
              if (isEditing) {
                updateMutation.mutate(form)
              } else {
                createMutation.mutate(form)
              }
            }}
            type="button"
          >
            {isEditing ? 'Guardar cambios' : 'Crear'}
          </button>
          {isEditing ? (
            <button
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
              onClick={() => selectedId != null && deleteMutation.mutate(selectedId)}
              type="button"
            >
              Eliminar
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}

