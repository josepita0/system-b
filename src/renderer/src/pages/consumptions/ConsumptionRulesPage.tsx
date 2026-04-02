import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Product, SaleFormat } from '@shared/types/product'
import type { SaleFormatConsumptionRuleInput, SaleFormatConsumptionRule } from '@shared/types/consumptionRule'

const rulesKey = ['consumptions', 'rules'] as const

export function ConsumptionRulesPage() {
  const queryClient = useQueryClient()
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null)
  const [form, setForm] = useState<SaleFormatConsumptionRuleInput>({
    productId: 0,
    saleFormatId: null,
    consumeQuantity: 0,
    unit: 'ml',
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const productsQuery = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => window.api.products.list(),
  })

  const formatsQuery = useQuery({
    queryKey: ['products', 'saleFormats'],
    queryFn: () => window.api.products.listSaleFormats(),
  })

  const rulesQuery = useQuery({
    queryKey: rulesKey,
    queryFn: () => window.api.consumptions.list(),
  })

  const productsById = useMemo(() => {
    const map = new Map<number, Product>()
    for (const p of productsQuery.data ?? []) {
      map.set(p.id, p)
    }
    return map
  }, [productsQuery.data])

  const formatsById = useMemo(() => {
    const map = new Map<number, SaleFormat>()
    for (const f of formatsQuery.data ?? []) {
      map.set(f.id, f)
    }
    return map
  }, [formatsQuery.data])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: rulesKey })
  }

  const createMutation = useMutation({
    mutationFn: (payload: SaleFormatConsumptionRuleInput) => window.api.consumptions.create(payload),
    onSuccess: async (row) => {
      setSelectedRuleId(row.id)
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear la regla.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: SaleFormatConsumptionRuleInput) =>
      selectedRuleId != null
        ? window.api.consumptions.update({ id: selectedRuleId, ...payload })
        : Promise.reject(new Error('Seleccione una regla.')),
    onSuccess: async () => {
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar la regla.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.consumptions.remove(id),
    onSuccess: async () => {
      setSelectedRuleId(null)
      setForm({ productId: 0, saleFormatId: null, consumeQuantity: 0, unit: 'ml' })
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible eliminar la regla.')
    },
  })

  const pick = (r: SaleFormatConsumptionRule) => {
    setSelectedRuleId(r.id)
    setForm({
      productId: r.productId,
      saleFormatId: r.saleFormatId,
      consumeQuantity: r.consumeQuantity,
      unit: r.unit,
    })
    setErrorMessage(null)
  }

  const rules = useMemo(() => (rulesQuery.data ?? []).slice(), [rulesQuery.data])

  return (
    <div className="grid grid-cols-[520px_1fr] gap-4 rounded-3xl bg-slate-950 p-4">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-white">Consumos por formato</h2>
        <p className="mt-1 text-sm text-slate-400">Define cuánto inventario (ml) consume un producto simple según su formato.</p>

        {rulesQuery.isLoading ? <div className="mt-4 text-sm text-slate-400">Cargando...</div> : null}
        {rulesQuery.error ? (
          <div className="mt-4 rounded-xl border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">
            {rulesQuery.error instanceof Error ? rulesQuery.error.message : 'No fue posible cargar reglas.'}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {rules.map((r) => {
            const p = productsById.get(r.productId)
            const f = r.saleFormatId != null ? formatsById.get(r.saleFormatId) : null
            const selected = selectedRuleId === r.id
            return (
              <button
                className={`w-full rounded-xl border px-3 py-3 text-left ${
                  selected ? 'border-cyan-700 bg-slate-800' : 'border-slate-800 bg-slate-950'
                }`}
                key={r.id}
                onClick={() => pick(r)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-100">{p?.name ?? `Producto #${r.productId}`}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Formato: {f?.name ?? (r.saleFormatId == null ? 'Sin formato' : `#${r.saleFormatId}`)}
                    </div>
                  </div>
                  <div className="text-sm text-cyan-300">
                    {r.consumeQuantity.toFixed(2)} {r.unit}
                  </div>
                </div>
              </button>
            )
          })}
          {!rules.length && !rulesQuery.isLoading ? <div className="text-sm text-slate-400">Sin reglas.</div> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">{selectedRuleId != null ? 'Editar regla' : 'Crear regla'}</h2>
          <button
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200"
            onClick={() => {
              setSelectedRuleId(null)
              setForm({ productId: 0, saleFormatId: null, consumeQuantity: 0, unit: 'ml' })
              setErrorMessage(null)
            }}
            type="button"
          >
            Nueva
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm text-slate-300">
            Producto
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              onChange={(e) => setForm((p) => ({ ...p, productId: Number(e.target.value) }))}
              value={form.productId || ''}
            >
              <option value="">Seleccione...</option>
              {(productsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Formato (opcional)
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              onChange={(e) => setForm((p) => ({ ...p, saleFormatId: e.target.value === '' ? null : Number(e.target.value) }))}
              value={form.saleFormatId ?? ''}
            >
              <option value="">Sin formato</option>
              {(formatsQuery.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Consumo por venta
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              onChange={(e) => setForm((p) => ({ ...p, consumeQuantity: Number(e.target.value) }))}
              step={0.01}
              type="number"
              value={form.consumeQuantity || ''}
            />
          </label>

          <label className="col-span-2 text-sm text-slate-300">
            Unidad
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              type="text"
              value={form.unit ?? 'ml'}
            />
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
              if (selectedRuleId != null) {
                updateMutation.mutate(form)
              } else {
                createMutation.mutate(form)
              }
            }}
            type="button"
          >
            {selectedRuleId != null ? 'Guardar' : 'Crear'}
          </button>
          {selectedRuleId != null ? (
            <button
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(selectedRuleId)}
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

