import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/Button'
import { Modal } from '@renderer/components/ui/Modal'
import type { InventoryBalanceRow } from '@shared/types/inventory'
import type { InventoryLot } from '@shared/types/inventoryProgressive'

type Props = {
  open: boolean
  product: InventoryBalanceRow | null
  onClose: () => void
}

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30'

export function ConsumptionConfigModal({ open, product, onClose }: Props) {
  const queryClient = useQueryClient()
  const [consumptionMode, setConsumptionMode] = useState<'unit' | 'progressive'>('unit')
  const [capacityQtyInput, setCapacityQtyInput] = useState('')
  const [capacityUnitInput, setCapacityUnitInput] = useState('ml')
  const [lotUnitsInput, setLotUnitsInput] = useState('1')
  const [lotNoteInput, setLotNoteInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const lotsQuery = useQuery({
    queryKey: ['inventory', 'lots', product?.productId],
    queryFn: () => window.api.inventory.listLots(product!.productId),
    enabled: open && typeof product?.productId === 'number',
  })

  useEffect(() => {
    if (open && product) {
      setConsumptionMode(product.consumptionMode)
      setCapacityQtyInput(product.capacityQuantity != null ? String(product.capacityQuantity) : '')
      setCapacityUnitInput(product.capacityUnit ?? 'ml')
      setLotUnitsInput('1')
      setLotNoteInput('')
      setErrorMessage(null)
    }
  }, [open, product?.productId, product?.consumptionMode, product?.capacityQuantity, product?.capacityUnit])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }

  const configMutation = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error('Producto no válido.')
      const cap =
        capacityQtyInput.trim() === '' ? null : Number(capacityQtyInput.trim().replace(',', '.'))
      if (consumptionMode === 'progressive') {
        if (cap == null || !Number.isFinite(cap) || cap <= 0) {
          throw new Error('Indique una capacidad válida.')
        }
      }
      return window.api.inventory.updateIngredientProgressiveConfig({
        productId: product.productId,
        consumptionMode,
        capacityQuantity: consumptionMode === 'progressive' ? cap : null,
        capacityUnit: consumptionMode === 'progressive' ? capacityUnitInput.trim() || 'ml' : null,
      })
    },
    onSuccess: async () => {
      setErrorMessage(null)
      await refresh()
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar la configuración.')
    },
  })

  const createLotsMutation = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error('Producto no válido.')
      const units = Number(lotUnitsInput.trim())
      if (!Number.isFinite(units) || !Number.isInteger(units) || units <= 0) {
        throw new Error('Indique una cantidad de unidades válida.')
      }
      return window.api.inventory.createLots({
        productId: product.productId,
        units,
        note: lotNoteInput.trim() ? lotNoteInput.trim() : null,
      })
    },
    onSuccess: async () => {
      setLotUnitsInput('1')
      setLotNoteInput('')
      setErrorMessage(null)
      await refresh()
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear las unidades.')
    },
  })

  if (!product) return null

  return (
    <Modal
      footer={
        <Button onClick={onClose} type="button" variant="secondary">
          Cerrar
        </Button>
      }
      maxWidthClass="max-w-lg"
      onClose={onClose}
      open={open}
      title="Configuración de consumo"
    >
      <p className="text-sm text-slate-600">
        Producto: <span className="font-semibold text-slate-900">{product.productName}</span>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Use consumo progresivo para botellas (ml) y porciones: se abren unidades automáticamente al consumir.
      </p>

      {errorMessage ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</div>
      ) : null}

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
      <div className="mt-3">
        <Button disabled={configMutation.isPending} onClick={() => configMutation.mutate()} variant="primary">
          {configMutation.isPending ? 'Aplicando...' : 'Aplicar configuración'}
        </Button>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-slate-50/80 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Unidades selladas (lotes)</h3>
        <p className="mt-1 text-xs text-slate-500">Registre cuántas botellas o unidades cerradas entran al inventario.</p>
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
        <div className="mt-3">
          <Button disabled={createLotsMutation.isPending} onClick={() => createLotsMutation.mutate()} variant="secondary">
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
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {(lotsQuery.data ?? []).slice(0, 12).map((lot: InventoryLot) => (
            <li
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
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
          {(lotsQuery.data?.length ?? 0) === 0 && !lotsQuery.isLoading ? (
            <li className="text-xs text-slate-500">Sin lotes registrados.</li>
          ) : null}
        </ul>
      </div>
    </Modal>
  )
}
