import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InventoryBalanceRow } from '@shared/types/inventory'
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

  return (
    <div className="grid grid-cols-[420px_1fr] gap-4 rounded-3xl bg-slate-950 p-4">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-white">Inventario</h2>
        <p className="mt-1 text-sm text-slate-400">Carga inicial, entradas y ajustes manuales.</p>
        <p className="mt-2 text-xs text-slate-500">
          Para operar, haga clic en un producto en la lista siguiente; quedará seleccionado para el panel de la derecha.
        </p>

        {balanceQuery.isLoading ? <div className="mt-4 text-sm text-slate-400">Cargando...</div> : null}
        {balanceQuery.error ? (
          <div className="mt-4 rounded-xl border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">
            {balanceQuery.error instanceof Error ? balanceQuery.error.message : 'No fue posible cargar el inventario.'}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {rows.map((r) => {
            const isLow = lowStockIds.has(r.productId)
            const isSelected = selectedProductId === r.productId
            return (
              <button
                key={r.productId}
                className={`w-full rounded-xl border px-3 py-3 text-left ${
                  isSelected ? 'border-cyan-700 bg-slate-800' : 'border-slate-800 bg-slate-950'
                }`}
                onClick={() => {
                  setSelectedProductId(r.productId)
                  setConsumptionMode(r.consumptionMode)
                  setCapacityQtyInput(r.capacityQuantity != null ? String(r.capacityQuantity) : '')
                  setCapacityUnitInput(r.capacityUnit ?? 'ml')
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-100">{r.productName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      SKU {r.sku} · Stock:{' '}
                      <span className={isLow ? 'text-amber-300' : 'text-slate-300'}>{Number(r.stock).toFixed(2)}</span> · Mínimo {r.minStock} · {r.consumptionMode === 'progressive' ? 'Progresivo' : 'Unitario'}
                    </div>
                  </div>
                  {isLow ? <div className="rounded-full bg-amber-600/20 px-2 py-1 text-xs text-amber-300">Bajo</div> : null}
                </div>
              </button>
            )
          })}
          {!rows.length && !balanceQuery.isLoading ? <div className="text-sm text-slate-400">Sin datos.</div> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-white">Registrar movimiento</h2>
        <p className="mt-1 text-sm text-slate-400">
          {selected ? (
            <>
              Seleccionado: <span className="text-slate-200">{selected.productName}</span>
            </>
          ) : (
            'Elija un producto en la lista de la izquierda (clic en la fila) para habilitar el registro.'
          )}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm text-slate-300">
            Tipo
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              onChange={(e) => setMovementKind(e.target.value as MovementKind)}
              value={movementKind}
            >
              <option value="opening">Stock inicial (entrada)</option>
              <option value="entry">Entrada</option>
              <option value="adjustment">Ajuste (+/-)</option>
            </select>
          </label>

          <label className="col-span-2 text-sm text-slate-300">
            Cantidad {movementKind === 'adjustment' ? '(puede ser negativa)' : ''}
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              onChange={(e) => setQtyInput(e.target.value)}
              step={0.01}
              type="number"
              value={qtyInput}
            />
          </label>

          <label className="col-span-2 text-sm text-slate-300">
            Nota (opcional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              onChange={(e) => setNoteInput(e.target.value)}
              type="text"
              value={noteInput}
            />
          </label>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">{errorMessage}</div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            disabled={postMutation.isPending || selectedProductId == null}
            onClick={() => postMutation.mutate()}
            type="button"
          >
            {postMutation.isPending ? 'Guardando...' : 'Registrar'}
          </button>
          <button
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200"
            onClick={() => {
              setQtyInput('')
              setNoteInput('')
              setErrorMessage(null)
            }}
            type="button"
          >
            Limpiar
          </button>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-6">
          <h3 className="text-sm font-medium text-slate-200">Consumo progresivo (configuración y lotes)</h3>
          <p className="mt-1 text-xs text-slate-500">
            Use esto para productos como botellas (ml): se consumen por porciones y se abren unidades automáticamente.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm text-slate-300">
              Modo
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                onChange={(e) => setConsumptionMode(e.target.value as 'unit' | 'progressive')}
                value={consumptionMode}
              >
                <option value="unit">Consumo único (unidad)</option>
                <option value="progressive">Consumo progresivo</option>
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Capacidad
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                disabled={consumptionMode !== 'progressive'}
                onChange={(e) => setCapacityQtyInput(e.target.value)}
                step={0.01}
                type="number"
                value={capacityQtyInput}
              />
            </label>
            <label className="text-sm text-slate-300">
              Unidad
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                disabled={consumptionMode !== 'progressive'}
                onChange={(e) => setCapacityUnitInput(e.target.value)}
                type="text"
                value={capacityUnitInput}
              />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
              disabled={selectedProductId == null || configMutation.isPending}
              onClick={() => configMutation.mutate()}
              type="button"
            >
              {configMutation.isPending ? 'Aplicando...' : 'Aplicar configuración'}
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h4 className="text-sm font-medium text-slate-200">Unidades selladas (lotes)</h4>
            <p className="mt-1 text-xs text-slate-500">Registre cuántas botellas/unidades entran al inventario.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-300">
                Unidades
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  onChange={(e) => setLotUnitsInput(e.target.value)}
                  type="number"
                  value={lotUnitsInput}
                />
              </label>
              <label className="text-sm text-slate-300">
                Nota (opcional)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  onChange={(e) => setLotNoteInput(e.target.value)}
                  type="text"
                  value={lotNoteInput}
                />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={selectedProductId == null || createLotsMutation.isPending}
                onClick={() => createLotsMutation.mutate()}
                type="button"
              >
                {createLotsMutation.isPending ? 'Creando...' : 'Agregar unidades'}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-200">Lotes recientes</h4>
            {lotsQuery.isLoading ? <p className="mt-2 text-xs text-slate-500">Cargando lotes...</p> : null}
            {lotsQuery.error ? (
              <p className="mt-2 text-xs text-rose-400">
                {lotsQuery.error instanceof Error ? lotsQuery.error.message : 'No fue posible cargar lotes.'}
              </p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {(lotsQuery.data ?? []).slice(0, 8).map((lot: InventoryLot) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-200"
                  key={lot.id}
                >
                  <div>
                    <div className="text-slate-100">#{lot.id}</div>
                    <div className="text-xs text-slate-500">
                      {lot.status} · {lot.remainingQuantity.toFixed(2)} / {lot.capacityQuantity.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{lot.openedAt ? `Abierto: ${lot.openedAt}` : 'Sellado'}</div>
                </li>
              ))}
              {selectedProductId != null && (lotsQuery.data?.length ?? 0) === 0 && !lotsQuery.isLoading ? (
                <li className="text-xs text-slate-500">Sin lotes registrados para este producto.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

