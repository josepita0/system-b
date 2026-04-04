import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { cn } from '@renderer/lib/cn'
import { tableTheadClass } from '@renderer/lib/tableStyles'
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

  const inputClass =
    'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30'

  const startNewRule = () => {
    setSelectedRuleId(null)
    setForm({ productId: 0, saleFormatId: null, consumeQuantity: 0, unit: 'ml' })
    setErrorMessage(null)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Consumos por formato</h1>
        <p className="text-sm text-slate-500">
          Defina cuánto inventario consume un producto simple según su formato de venta (por ejemplo, ml por trago o por unidad).
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,520px)_1fr]">
        <Card className="min-h-0 shadow-sm" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900">Reglas</h2>
          <p className="mt-1 text-xs text-slate-500">Seleccione una fila para editarla en el panel derecho.</p>

          {rulesQuery.isLoading ? <div className="mt-4 text-sm text-slate-500">Cargando...</div> : null}
          {rulesQuery.error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {rulesQuery.error instanceof Error ? rulesQuery.error.message : 'No fue posible cargar reglas.'}
            </div>
          ) : null}

          {!rulesQuery.isLoading && !rulesQuery.error ? (
            <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner">
              <table className="min-w-full text-left text-sm text-slate-800">
                <thead className={tableTheadClass}>
                  <tr>
                    <th className="px-3 py-3">Producto</th>
                    <th className="px-3 py-3">Formato</th>
                    <th className="px-3 py-3 text-right">Consumo</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r, index) => {
                    const p = productsById.get(r.productId)
                    const f = r.saleFormatId != null ? formatsById.get(r.saleFormatId) : null
                    const selected = selectedRuleId === r.id
                    const formatLabel = f?.name ?? (r.saleFormatId == null ? 'Sin formato' : `#${r.saleFormatId}`)
                    return (
                      <tr
                        aria-label={`Editar regla: ${p?.name ?? `Producto #${r.productId}`}`}
                        className={cn(
                          'cursor-pointer border-t border-slate-200 transition-colors',
                          selected
                            ? 'bg-brand/10 ring-2 ring-inset ring-brand/40 hover:bg-brand/15'
                            : index % 2 === 0
                              ? 'bg-white hover:bg-slate-50'
                              : 'bg-slate-50/80 hover:bg-slate-100/80',
                        )}
                        key={r.id}
                        onClick={() => pick(r)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            pick(r)
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="px-3 py-3 font-medium text-slate-900">{p?.name ?? `Producto #${r.productId}`}</td>
                        <td className="px-3 py-3 text-slate-700">{formatLabel}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-brand">
                          {r.consumeQuantity.toFixed(2)} {r.unit}
                        </td>
                      </tr>
                    )
                  })}
                  {!rules.length ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={3}>
                        Sin reglas.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card className="min-h-0 shadow-sm" padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{selectedRuleId != null ? 'Editar regla' : 'Crear regla'}</h2>
            <Button onClick={startNewRule} type="button" variant="secondary">
              Nueva
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-medium text-slate-700">Producto</span>
              <select
                className={inputClass}
                onChange={(e) => setForm((p) => ({ ...p, productId: Number(e.target.value) }))}
                value={form.productId || ''}
              >
                <option value="">Seleccione...</option>
                {(productsQuery.data ?? []).map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Formato (opcional)</span>
              <select
                className={inputClass}
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

            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Consumo por venta</span>
              <input
                className={inputClass}
                onChange={(e) => setForm((p) => ({ ...p, consumeQuantity: Number(e.target.value) }))}
                step={0.01}
                type="number"
                value={form.consumeQuantity || ''}
              />
            </label>

            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-medium text-slate-700">Unidad</span>
              <input className={inputClass} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} type="text" value={form.unit ?? 'ml'} />
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
              onClick={() => {
                if (selectedRuleId != null) {
                  updateMutation.mutate(form)
                } else {
                  createMutation.mutate(form)
                }
              }}
              variant="primary"
            >
              {selectedRuleId != null ? 'Guardar' : 'Crear'}
            </Button>
            {selectedRuleId != null ? (
              <Button
                disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selectedRuleId)}
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

