import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { cn } from '@renderer/lib/cn'
import { tableTheadClass } from '@renderer/lib/tableStyles'
import type { InventoryLot } from '@shared/types/inventoryProgressive'

const balanceKey = ['inventory', 'balance'] as const

type MovementKind = 'opening' | 'entry' | 'adjustment'

export function InventoryPage() {
  const queryClient = useQueryClient()
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [movementKind, setMovementKind] = useState<MovementKind>('entry')
  const [qtyInput, setQtyInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [consumptionMode, setConsumptionMode] = useState<'unit' | 'progressive'>('unit')
  const [capacityQtyInput, setCapacityQtyInput] = useState('')
  const [capacityUnitInput, setCapacityUnitInput] = useState('ml')
  const [lotUnitsInput, setLotUnitsInput] = useState('1')
  const [lotNoteInput, setLotNoteInput] = useState('')
  const [progressiveOpen, setProgressiveOpen] = useState(false)

  const balanceQuery = useQuery({
    queryKey: balanceKey,
    queryFn: () => window.api.inventory.listBalance(),
  })

  const lotsQuery = useQuery({
    queryKey: ['inventory', 'lots', selectedProductId],
    queryFn: () => window.api.inventory.listLots(selectedProductId!),
    enabled: typeof selectedProductId === 'number',
  })

  const rows = useMemo(() => (balanceQuery.data ?? []).slice(), [balanceQuery.data])
  const selected = useMemo(
    () => rows.find((r) => r.productId === selectedProductId) ?? null,
    [rows, selectedProductId],
  )

  const parsedQty = useMemo(() => {
    const t = qtyInput.trim()
    if (t === '') {
      return null
    }
    const n = Number(t.replace(',', '.'))
    if (!Number.isFinite(n)) {
      return null
    }
    return n
  }, [qtyInput])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: balanceKey })
    await queryClient.invalidateQueries({ queryKey: ['inventory', 'lots'] })
  }

  const postMutation = useMutation({
    mutationFn: async () => {
      if (selectedProductId == null) {
        throw new Error('Seleccione un producto/insumo.')
      }
      if (parsedQty == null) {
        throw new Error('Indique una cantidad válida.')
      }
      const payload = {
        productId: selectedProductId,
        quantity: parsedQty,
        note: noteInput.trim() ? noteInput.trim() : null,
      }
      if (movementKind === 'opening') {
        return window.api.inventory.postOpening(payload)
      }
      if (movementKind === 'entry') {
        return window.api.inventory.postEntry(payload)
      }
      return window.api.inventory.postAdjustment(payload)
    },
    onSuccess: async () => {
      setQtyInput('')
      setNoteInput('')
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible registrar el movimiento.')
    },
  })

  const configMutation = useMutation({
    mutationFn: async () => {
      if (selectedProductId == null) {
        throw new Error('Seleccione un producto/insumo.')
      }
      const cap =
        capacityQtyInput.trim() === '' ? null : Number(capacityQtyInput.trim().replace(',', '.'))
      if (consumptionMode === 'progressive') {
        if (cap == null || !Number.isFinite(cap) || cap <= 0) {
          throw new Error('Indique una capacidad válida.')
        }
      }
      return window.api.inventory.updateIngredientProgressiveConfig({
        productId: selectedProductId,
        consumptionMode,
        capacityQuantity: consumptionMode === 'progressive' ? cap : null,
        capacityUnit: consumptionMode === 'progressive' ? capacityUnitInput.trim() || 'ml' : null,
      })
    },
    onSuccess: async () => {
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar la configuración.')
    },
  })

  const createLotsMutation = useMutation({
    mutationFn: async () => {
      if (selectedProductId == null) {
        throw new Error('Seleccione un producto/insumo.')
      }
      const units = Number(lotUnitsInput.trim())
      if (!Number.isFinite(units) || !Number.isInteger(units) || units <= 0) {
        throw new Error('Indique una cantidad de unidades válida.')
      }
      return window.api.inventory.createLots({
        productId: selectedProductId,
        units,
        note: lotNoteInput.trim() ? lotNoteInput.trim() : null,
      })
    },
    onSuccess: async () => {
      setLotUnitsInput('1')
      setLotNoteInput('')
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear las unidades.')
    },
  })

  const lowStockIds = useMemo(() => {
    const set = new Set<number>()
    for (const r of rows) {
      if (r.stock <= r.minStock) {
        set.add(r.productId)
      }
    }
    return set
  }, [rows])

  const inputClass =
    'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30'

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inventario</h1>
        <p className="text-sm text-slate-500">Carga inicial, entradas y ajustes manuales.</p>
        <p className="mt-1 text-sm text-slate-500">
          Para operar, haga clic en una fila de la tabla; el producto quedará seleccionado para el panel de la derecha.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,440px)_1fr]">
        <Card className="min-h-0 shadow-sm" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900">Productos e insumos</h2>
          <p className="mt-1 text-xs text-slate-500">Seleccione un ítem para registrar movimientos y configurar consumo progresivo.</p>

          {balanceQuery.isLoading ? <div className="mt-4 text-sm text-slate-500">Cargando...</div> : null}
          {balanceQuery.error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {balanceQuery.error instanceof Error ? balanceQuery.error.message : 'No fue posible cargar el inventario.'}
            </div>
          ) : null}

          {!balanceQuery.isLoading && !balanceQuery.error ? (
            <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner">
              <table className="min-w-full text-left text-sm text-slate-800">
                <thead className={tableTheadClass}>
                  <tr>
                    <th className="px-3 py-3">Producto</th>
                    <th className="px-3 py-3 text-right">Stock</th>
                    <th className="px-3 py-3 text-right">Mín.</th>
                    <th className="px-3 py-3">Modo</th>
                    <th className="px-3 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, index) => {
                    const isLow = lowStockIds.has(r.productId)
                    const isSelected = selectedProductId === r.productId
                    return (
                      <tr
                        aria-label={`Seleccionar ${r.productName}`}
                        className={cn(
                          'cursor-pointer border-t border-slate-200 transition-colors',
                          isSelected
                            ? 'bg-brand/10 ring-2 ring-inset ring-brand/40 hover:bg-brand/15'
                            : index % 2 === 0
                              ? 'bg-white hover:bg-slate-50'
                              : 'bg-slate-50/80 hover:bg-slate-100/80',
                        )}
                        key={r.productId}
                        onClick={() => {
                          setSelectedProductId(r.productId)
                          setConsumptionMode(r.consumptionMode)
                          setCapacityQtyInput(r.capacityQuantity != null ? String(r.capacityQuantity) : '')
                          setCapacityUnitInput(r.capacityUnit ?? 'ml')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedProductId(r.productId)
                            setConsumptionMode(r.consumptionMode)
                            setCapacityQtyInput(r.capacityQuantity != null ? String(r.capacityQuantity) : '')
                            setCapacityUnitInput(r.capacityUnit ?? 'ml')
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="px-3 py-3 font-medium text-slate-900">{r.productName}</td>
                        <td className={cn('px-3 py-3 text-right tabular-nums', isLow ? 'font-semibold text-amber-800' : 'text-slate-900')}>
                          {Number(r.stock).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">{r.minStock}</td>
                        <td className="px-3 py-3 text-slate-700">{r.consumptionMode === 'progressive' ? 'Progresivo' : 'Unitario'}</td>
                        <td className="px-3 py-3">
                          {isLow ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Bajo</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!rows.length ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                        Sin datos.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card className="min-h-0 shadow-sm" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900">Registrar movimiento</h2>
          <p className="mt-1 text-sm text-slate-600">
            {selected ? (
              <>
                Seleccionado: <span className="font-medium text-slate-900">{selected.productName}</span>
              </>
            ) : (
              'Elija un producto en la tabla de la izquierda (clic en la fila) para habilitar el registro.'
            )}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-medium text-slate-700">Tipo</span>
              <select
                className={inputClass}
                onChange={(e) => setMovementKind(e.target.value as MovementKind)}
                value={movementKind}
              >
                <option value="opening">Stock inicial (entrada)</option>
                <option value="entry">Entrada</option>
                <option value="adjustment">Ajuste (+/-)</option>
              </select>
            </label>

            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Cantidad {movementKind === 'adjustment' ? '(puede ser negativa)' : ''}
              </span>
              <input className={inputClass} onChange={(e) => setQtyInput(e.target.value)} step={0.01} type="number" value={qtyInput} />
            </label>

            <label className="col-span-2 text-sm">
              <span className="mb-1 block font-medium text-slate-700">Nota (opcional)</span>
              <input className={inputClass} onChange={(e) => setNoteInput(e.target.value)} type="text" value={noteInput} />
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button disabled={postMutation.isPending || selectedProductId == null} onClick={() => postMutation.mutate()} variant="primary">
              {postMutation.isPending ? 'Guardando...' : 'Registrar'}
            </Button>
            <Button
              onClick={() => {
                setQtyInput('')
                setNoteInput('')
                setErrorMessage(null)
              }}
              type="button"
              variant="secondary"
            >
              Limpiar
            </Button>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-slate-50/80">
            <button
              aria-expanded={progressiveOpen}
              className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-slate-100/80"
              onClick={() => setProgressiveOpen((o) => !o)}
              type="button"
            >
              <span className="mt-0.5 shrink-0 text-slate-500" aria-hidden>
                <svg
                  className={cn('h-5 w-5 transition-transform', progressiveOpen && 'rotate-90')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">Consumo progresivo (configuración y lotes)</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Botellas (ml) y porciones: abrir para configurar modo, lotes sellados y ver lotes recientes.
                </span>
              </span>
            </button>

            {progressiveOpen ? (
              <div className="border-t border-border px-4 pb-4 pt-2">
                <p className="text-xs text-slate-500">
                  Use esto para productos como botellas (ml): se consumen por porciones y se abren unidades automáticamente.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="col-span-2 text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Modo</span>
                    <select
                      className={inputClass}
                      onChange={(e) => setConsumptionMode(e.target.value as 'unit' | 'progressive')}
                      value={consumptionMode}
                    >
                      <option value="unit">Consumo único (unidad)</option>
                      <option value="progressive">Consumo progresivo</option>
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Capacidad</span>
                    <input
                      className={inputClass}
                      disabled={consumptionMode !== 'progressive'}
                      onChange={(e) => setCapacityQtyInput(e.target.value)}
                      step={0.01}
                      type="number"
                      value={capacityQtyInput}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Unidad</span>
                    <input
                      className={inputClass}
                      disabled={consumptionMode !== 'progressive'}
                      onChange={(e) => setCapacityUnitInput(e.target.value)}
                      type="text"
                      value={capacityUnitInput}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button disabled={selectedProductId == null || configMutation.isPending} onClick={() => configMutation.mutate()} variant="secondary">
                    {configMutation.isPending ? 'Aplicando...' : 'Aplicar configuración'}
                  </Button>
                </div>

                <div className="mt-6 rounded-xl border border-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Unidades selladas (lotes)</h3>
                  <p className="mt-1 text-xs text-slate-500">Registre cuántas botellas/unidades entran al inventario.</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-700">Unidades</span>
                      <input className={inputClass} onChange={(e) => setLotUnitsInput(e.target.value)} type="number" value={lotUnitsInput} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-700">Nota (opcional)</span>
                      <input className={inputClass} onChange={(e) => setLotNoteInput(e.target.value)} type="text" value={lotNoteInput} />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      disabled={selectedProductId == null || createLotsMutation.isPending}
                      onClick={() => createLotsMutation.mutate()}
                      variant="primary"
                    >
                      {createLotsMutation.isPending ? 'Creando...' : 'Agregar unidades'}
                    </Button>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-900">Lotes recientes</h3>
                  {lotsQuery.isLoading ? <p className="mt-2 text-xs text-slate-500">Cargando lotes...</p> : null}
                  {lotsQuery.error ? (
                    <p className="mt-2 text-xs text-rose-600">
                      {lotsQuery.error instanceof Error ? lotsQuery.error.message : 'No fue posible cargar lotes.'}
                    </p>
                  ) : null}
                  <ul className="mt-3 space-y-2">
                    {(lotsQuery.data ?? []).slice(0, 8).map((lot: InventoryLot) => (
                      <li
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                        key={lot.id}
                      >
                        <div>
                          <div className="font-medium text-slate-900">#{lot.id}</div>
                          <div className="text-xs text-slate-600">
                            {lot.status} · {lot.remainingQuantity.toFixed(2)} / {lot.capacityQuantity.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-xs text-slate-600">{lot.openedAt ? `Abierto: ${lot.openedAt}` : 'Sellado'}</div>
                      </li>
                    ))}
                    {selectedProductId != null && (lotsQuery.data?.length ?? 0) === 0 && !lotsQuery.isLoading ? (
                      <li className="text-xs text-slate-500">Sin lotes registrados para este producto.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </section>
  )
}

