import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/Button'
import { Modal } from '@renderer/components/ui/Modal'
import type { InventoryBalanceRow } from '@shared/types/inventory'

type MovementKind = 'opening' | 'entry' | 'adjustment'

type Props = {
  open: boolean
  product: InventoryBalanceRow | null
  onClose: () => void
  /** Abre el modal de configuración de consumo para el mismo producto. */
  onOpenConsumptionConfig: () => void
}

const inputClass =
  'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30'

export function RegisterMovementModal({ open, product, onClose, onOpenConsumptionConfig }: Props) {
  const queryClient = useQueryClient()
  const [movementKind, setMovementKind] = useState<MovementKind>('entry')
  const [qtyInput, setQtyInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open && product) {
      setMovementKind('entry')
      setQtyInput('')
      setNoteInput('')
      setErrorMessage(null)
    }
  }, [open, product?.productId])

  const parsedQty = useMemo(() => {
    const t = qtyInput.trim()
    if (t === '') return null
    const n = Number(t.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }, [qtyInput])

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error('Producto no válido.')
      if (parsedQty == null) throw new Error('Indique una cantidad válida.')
      const payload = {
        productId: product.productId,
        quantity: parsedQty,
        note: noteInput.trim() ? noteInput.trim() : null,
      }
      if (movementKind === 'opening') return window.api.inventory.postOpening(payload)
      if (movementKind === 'entry') return window.api.inventory.postEntry(payload)
      return window.api.inventory.postAdjustment(payload)
    },
    onSuccess: async () => {
      setQtyInput('')
      setNoteInput('')
      setErrorMessage(null)
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible registrar el movimiento.')
    },
  })

  if (!product) return null

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={postMutation.isPending} onClick={() => postMutation.mutate()} variant="primary">
            {postMutation.isPending ? 'Guardando...' : 'Registrar movimiento'}
          </Button>
        </>
      }
      maxWidthClass="max-w-lg"
      onClose={onClose}
      open={open}
      title="Registrar movimiento"
    >
      <p className="text-sm text-slate-600">
        Producto: <span className="font-semibold text-slate-900">{product.productName}</span>
      </p>

      <div className="mt-4 grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Tipo</span>
          <select className={inputClass} onChange={(e) => setMovementKind(e.target.value as MovementKind)} value={movementKind}>
            <option value="opening">Stock inicial (entrada)</option>
            <option value="entry">Entrada</option>
            <option value="adjustment">Ajuste (+/-)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Cantidad {movementKind === 'adjustment' ? '(puede ser negativa)' : ''}
          </span>
          <input className={inputClass} onChange={(e) => setQtyInput(e.target.value)} step={0.01} type="number" value={qtyInput} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Nota (opcional)</span>
          <input className={inputClass} onChange={(e) => setNoteInput(e.target.value)} type="text" value={noteInput} />
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-slate-50/90 px-3 py-2.5 text-sm text-slate-700">
        <span className="font-medium text-slate-800">Consumo progresivo y lotes</span>
        <p className="mt-1 text-xs text-slate-600">
          El modo de consumo, capacidad por unidad y altas de lotes sellados se configuran aparte, sin mezclarlos con el movimiento
          manual de stock.
        </p>
        <Button className="mt-2" onClick={onOpenConsumptionConfig} type="button" variant="secondary">
          Configurar consumo / lotes
        </Button>
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</div>
      ) : null}
    </Modal>
  )
}
